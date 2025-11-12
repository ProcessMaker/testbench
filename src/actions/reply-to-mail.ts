import Imap from 'imap';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { ActionOptions } from '../types/action';
import { fetchTunnelUrls, applyTunnelSubstitution } from '../utils/tunnel-substitution';

interface MailtoData {
    to: string;
    subject: string;
    bodyText: string;
}

/**
 * Minimal quoted-printable decoder to handle soft line breaks and =XX bytes.
 */
function decodeQuotedPrintable(input: string): string {
    // Remove soft line breaks: '=' at end of line means continuation
    const withoutSoftBreaks = input.replace(/=\r?\n/g, '');
    // Decode =XX hex escapes
    return withoutSoftBreaks.replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) => {
        try {
            return String.fromCharCode(parseInt(hex, 16));
        } catch {
            return '=' + hex;
        }
    });
}

/**
 * Extract mailto link from email body and parse query parameters
 */
function extractMailtoData(emailBody: string): MailtoData | null {
    // Decode quoted-printable artifacts first
    const decoded = decodeQuotedPrintable(emailBody);
    // Look for mailto links in the decoded body
    const mailtoRegex = /href="mailto:([^"]+)"/gi;
    const matches = Array.from(decoded.matchAll(mailtoRegex));

    if (matches.length === 0) {
        return null;
    }

    // Use the first mailto link found
    const mailtoUrl = matches[0][1];

    // Parse the mailto URL
    const url = new URL(`mailto:${mailtoUrl}`);
    const to = url.pathname;
    const subject = url.searchParams.get('subject') || '';
    const bodyParam = url.searchParams.get('body') || '';

    // Decode URL-encoded parameters
    const decodedSubject = decodeURIComponent(subject);
    const decodedBody = decodeURIComponent(bodyParam);

    return {
        to,
        subject: decodedSubject,
        bodyText: decodedBody
    };
}

/**
 * Create SMTP transporter from settings
 */
function createSmtpTransporter(settings: Record<string, string>): nodemailer.Transporter {
    const smtpConfig = {
        host: settings.EMAIL_CONNECTOR_MAIL_HOST,
        port: parseInt(settings.EMAIL_CONNECTOR_MAIL_PORT) || 587,
        secure: false, // Use explicit TLS
        auth: {
            user: settings.EMAIL_CONNECTOR_MAIL_USERNAME,
            pass: settings.EMAIL_CONNECTOR_MAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Don't validate certificates for testing
        }
    };

    return nodemailer.createTransport(smtpConfig);
}

export async function replyToMail(options: ActionOptions = {}): Promise<number> {
    const { site } = options;

    if (!site) {
        throw new Error('Site configuration is required for mail processing');
    }

    // Load settings from the mailConfig file specified in the site configuration
    const mailConfigFile = site.mailConfig || 'gmail.json';
    const settingsPath = path.join(__dirname, '..', 'settings', mailConfigFile);

    let settings: Record<string, string>;
    try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsData);
    } catch (error) {
        throw new Error(`Failed to load email settings from ${settingsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // If useTunnel is true, fetch tunnel information and update IMAP settings
    if (site.useTunnel) {
        const tcpTunnels = process.env.TCP_TUNNELS;
        if (!tcpTunnels) {
            throw new Error('TCP_TUNNELS environment variable is required when useTunnel is true');
        }
        try {
            const tunnels = await fetchTunnelUrls(tcpTunnels);
            applyTunnelSubstitution(settings, tunnels);
        } catch (error) {
            throw new Error(`Failed to apply tunnel substitution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Extract IMAP settings (ignore abe_imap_interval as requested)
    const imapConfig = {
        user: 'receiver@example.test',
        password: settings.abe_imap_password,
        host: settings.abe_imap_server,
        port: parseInt(settings.abe_imap_port) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    };

    // Validate required IMAP settings
    if (!imapConfig.user || !imapConfig.password || !imapConfig.host) {
        throw new Error('Missing required IMAP settings: abe_imap_username, abe_imap_password, or abe_imap_server ' + JSON.stringify(imapConfig));
    }

    // Validate required SMTP settings
    if (!settings.EMAIL_CONNECTOR_MAIL_HOST || !settings.EMAIL_CONNECTOR_MAIL_USERNAME || !settings.EMAIL_CONNECTOR_MAIL_PASSWORD) {
        throw new Error('Missing required SMTP settings: EMAIL_CONNECTOR_MAIL_HOST, EMAIL_CONNECTOR_MAIL_USERNAME, or EMAIL_CONNECTOR_MAIL_PASSWORD');
    }

    // Create SMTP transporter
    const transporter = createSmtpTransporter(settings);

    console.log('📧 Connecting to IMAP server...');
    console.log(JSON.stringify(imapConfig, null, 2));

    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once('ready', () => {
            console.log('✅ Connected to IMAP server');

            // Open the specified mailbox (default to INBOX)
            const mailbox = settings.abe_imap_path || 'INBOX';
            // Open in read-write mode so we can add flags like \Seen
            imap.openBox(mailbox, false, (err, box) => {
                if (err) {
                    reject(new Error(`Failed to open mailbox ${mailbox}: ${err.message}`));
                    return;
                }

                console.log(`📁 Opened mailbox: ${mailbox}`);
                console.log(`Total messages: ${box.messages.total}`);

                // Search for unread messages
                imap.search(['UNSEEN'], (err, results) => {
                    if (err) {
                        reject(new Error(`Failed to search for unread messages: ${err.message}`));
                        return;
                    }

                    if (!results || results.length === 0) {
                        console.log('📭 No unread messages found');
                        imap.end();
                        resolve(0);
                        return;
                    }

                    console.log(`📬 Found ${results.length} unread message(s)`);

                    // Process messages one by one to handle replies
                    let processedCount = 0;
                    let repliedCount = 0;
                    let skippedCount = 0;

                    const processNextMessage = async (index: number) => {
                        if (index >= results.length) {
                            console.log(`\n✅ Finished processing ${processedCount} unread message(s)`);
                            console.log(`📧 Sent ${repliedCount} reply(ies)`);
                            console.log(`⏭️  Skipped ${skippedCount} message(s) (no mailto link)`);
                            imap.end();
                            resolve(repliedCount);
                            return;
                        }

                        const seqno = results[index];
                        console.log(`\n--- Processing Message ${index + 1}/${results.length} (Sequence: ${seqno}) ---`);

                        const fetch = imap.fetch(seqno, {
                            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT'],
                            struct: true
                        });

                        let headerBuffer = '';
                        let bodyBuffer = '';
                        let messageUid: number | null = null;
                        let advanced = false;
                        const advanceNext = () => {
                            if (advanced) return;
                            advanced = true;
                            processedCount++;
                            setTimeout(() => processNextMessage(index + 1), 100);
                        };

                        fetch.on('message', (msg, msgSeqno) => {
                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    if (info.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)') {
                                        headerBuffer += chunk.toString('utf8');
                                    } else if (info.which === 'TEXT') {
                                        bodyBuffer += chunk.toString('utf8');
                                    }
                                });

                                stream.once('end', () => {
                                    if (info.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)') {
                                        try {
                                            const headers = Imap.parseHeader(headerBuffer);
                                            console.log('From:', headers.from?.[0] || 'N/A');
                                            console.log('To:', headers.to?.[0] || 'N/A');
                                            console.log('Subject:', headers.subject?.[0] || 'N/A');
                                            console.log('Date:', headers.date?.[0] || 'N/A');
                                        } catch (parseErr) {
                                            console.log('Parse error:', parseErr instanceof Error ? parseErr.message : 'Unknown error');
                                        }
                                    } else if (info.which === 'TEXT') {
                                        console.log('Body preview:', bodyBuffer.substring(0, 200) + (bodyBuffer.length > 200 ? '...' : ''));

                                        // Extract mailto data from body
                                        const mailtoData = extractMailtoData(bodyBuffer);

                                        if (!mailtoData) {
                                            console.log('⏭️  No mailto link found, skipping message');
                                            skippedCount++;

                                            // Mark skipped message as read using sequence number to avoid UID ordering issues
                                            imap.seq.addFlags(msgSeqno, '\\Seen', (err) => {
                                                if (err) {
                                                    console.log('⚠️  Warning: Could not mark message as read:', err.message);
                                                } else {
                                                    console.log('📖 Message marked as read');
                                                }
                                                advanceNext();
                                            });
                                        } else {
                                            console.log('📧 Found mailto link:');
                                            console.log('  To:', mailtoData.to);
                                            console.log('  Subject:', mailtoData.subject);
                                            console.log('  Body preview:', mailtoData.bodyText.substring(0, 100) + (mailtoData.bodyText.length > 100 ? '...' : ''));

                                            // Send reply email
                                            const mailOptions = {
                                                from: {
                                                    name: settings.EMAIL_CONNECTOR_MAIL_FROM_NAME || 'TestBench',
                                                    address: settings.EMAIL_CONNECTOR_MAIL_FROM_ADDRESS || settings.EMAIL_CONNECTOR_MAIL_USERNAME
                                                },
                                                to: mailtoData.to,
                                                subject: mailtoData.subject,
                                                text: mailtoData.bodyText
                                            };

                                            console.log('📤 Sending reply email...');
                                            transporter.sendMail(mailOptions)
                                                .then(() => {
                                                    console.log('✅ Reply sent successfully');
                                                    repliedCount++;

                                                    // Mark message as read using sequence number to avoid UID ordering issues
                                                    imap.seq.addFlags(msgSeqno, '\\Seen', (err) => {
                                                        if (err) {
                                                            console.log('⚠️  Warning: Could not mark message as read:', err.message);
                                                        } else {
                                                            console.log('📖 Message marked as read');
                                                        }
                                                        advanceNext();
                                                    });
                                                })
                                                .catch((emailErr) => {
                                                    console.log('❌ Failed to send reply:', emailErr instanceof Error ? emailErr.message : 'Unknown error');
                                                    // Even on failure, proceed to next message to avoid stalling
                                                    advanceNext();
                                                });
                                        }
                                    }
                                });
                            });

                            msg.once('attributes', (attrs) => {
                                messageUid = attrs.uid;
                                console.log('UID:', attrs.uid);
                                console.log('Size:', attrs.size, 'bytes');
                            });

                            // Do not advance on 'end' anymore; advancing is controlled
                            // after async actions (sending email / marking seen) complete.
                        });

                        fetch.once('error', (err: Error) => {
                            console.log('❌ Error fetching message:', err.message);
                            advanceNext();
                        });
                    };

                    // Start processing messages
                    processNextMessage(0);
                });
            });
        });

        imap.once('error', (err: Error) => {
            reject(new Error(`IMAP connection error: ${err.message}`));
        });

        imap.once('end', () => {
            console.log('📧 IMAP connection closed');
        });

        // Connect to the IMAP server
        imap.connect();
    });
}
