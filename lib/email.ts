import nodemailer from 'nodemailer';

// Support multiple email providers
// Priority: RESEND_API_KEY > Gmail SMTP > SendGrid
let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  // Option 1: Resend (if API key is set)
  if (process.env.RESEND_API_KEY) {
    // Resend uses their own API, we'll handle it separately
    return null; // Signal to use Resend API
  }

  // Option 2: Gmail SMTP (free, requires app password)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    return emailTransporter;
  }

  // Option 3: Gmail with OAuth2 (more complex, but more secure)
  // For now, we'll use app password method above

  return null;
}

// Resend API function (if using Resend)
async function sendViaResend(email: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Strategy Reality Check <noreply@yourdomain.com>',
    to: email,
    subject,
    html,
  });
}

interface StrategyReport {
  verdict: string;
  metrics: {
    expectedValue: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  probabilityRandom: number;
  stabilityCheck: {
    degradation: boolean;
  };
}

export async function sendStrategyReport(
  email: string,
  report: StrategyReport
) {
  // Check if any email service is configured
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  if (!hasResend && !hasSMTP) {
    console.warn('No email service configured. Set RESEND_API_KEY or SMTP settings.');
    throw new Error('Email service not configured');
  }

  const verdictEmoji = report.verdict === 'LIKELY_POSITIVE_EDGE' 
    ? '✅' 
    : report.verdict === 'LIKELY_NEGATIVE_EDGE' 
    ? '🟠' 
    : '🔴';

  const verdictText = report.verdict === 'LIKELY_POSITIVE_EDGE'
    ? 'Your strategy appears to work!'
    : report.verdict === 'LIKELY_NEGATIVE_EDGE'
    ? 'Your strategy is losing money'
    : 'Not enough evidence yet';

  const subject = `Your Strategy Analysis Report - ${verdictText}`;
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Strategy Reality Check</h1>
          </div>
          
          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 48px; margin-bottom: 10px;">${verdictEmoji}</div>
              <h2 style="margin: 0; font-size: 24px; color: #1f2937;">${verdictText}</h2>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Expected Value</h3>
              <div style="font-size: 32px; font-weight: bold; color: ${report.metrics.expectedValue >= 0 ? '#10b981' : '#ef4444'};">
                ${report.metrics.expectedValue >= 0 ? '+' : ''}${report.metrics.expectedValue.toFixed(2)}R
              </div>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Win Rate</h3>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">
                ${(report.metrics.winRate * 100).toFixed(1)}%
              </div>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Profit Factor</h3>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">
                ${report.metrics.profitFactor.toFixed(2)}
              </div>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Probability of Randomness</h3>
              <div style="font-size: 32px; font-weight: bold; color: ${report.probabilityRandom < 0.2 ? '#10b981' : report.probabilityRandom < 0.5 ? '#f59e0b' : '#ef4444'};">
                ${(report.probabilityRandom * 100).toFixed(1)}%
              </div>
              <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Lower is better. Below 20% indicates a real edge.</p>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px;">
              <h3 style="margin-top: 0; color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Trade Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <div>
                  <div style="font-size: 12px; color: #6b7280;">Total Trades</div>
                  <div style="font-size: 20px; font-weight: bold; color: #1f2937;">${report.metrics.totalTrades}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280;">Winning</div>
                  <div style="font-size: 20px; font-weight: bold; color: #10b981;">${report.metrics.winningTrades}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280;">Losing</div>
                  <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${report.metrics.losingTrades}</div>
                </div>
              </div>
            </div>
          </div>
          
          ${report.stabilityCheck.degradation ? `
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Performance degraded in second half</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 10px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Want to analyze more strategies?<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #667eea; text-decoration: none; font-weight: 600;">Visit Strategy Reality Check →</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an automated report from Strategy Reality Check.<br>
              No account required • Privacy-first
            </p>
          </div>
        </body>
        </html>
      `;

  try {
    // Use Resend if configured
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(email, subject, html);
      return { success: true };
    }

    // Otherwise use SMTP
    const transporter = getEmailTransporter();
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@yourdomain.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Strategy Reality Check';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
