"""
backend/alerting.py — Email alerts when the LTVF match rate drops below the warn threshold.

Configure via environment variables:
  SMTP_HOST      — SMTP server hostname (e.g. smtp.office365.com)
  SMTP_PORT      — SMTP port (default: 587)
  SMTP_USER      — Sender email / SMTP login
  SMTP_PASS      — SMTP password
  ALERT_EMAIL_TO — Comma-separated list of recipient email addresses

If any of the above are not set, alerting is silently skipped.
Alternatively set ALERT_EMAIL_TO=off to disable alerts explicitly.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from settings import get_settings

log = logging.getLogger(__name__)

SMTP_HOST  = os.getenv("SMTP_HOST", "")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
ALERT_TO   = os.getenv("ALERT_EMAIL_TO", "")


def _is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS and ALERT_TO and ALERT_TO.lower() != "off")


def send_alert_if_needed(system_tag: str, overall_rate: float) -> None:
    """
    Checks the warn threshold for the given system_tag and sends an alert email
    if overall_rate is below it. Safe to call unconditionally — silently no-ops
    when alerting is not configured.
    """
    if not _is_configured():
        return

    try:
        thresholds = get_settings(system_tag)
        warn_threshold = thresholds.get("warn", 80)

        if overall_rate >= warn_threshold:
            return  # rate is acceptable — no alert needed

        recipients = [r.strip() for r in ALERT_TO.split(",") if r.strip()]
        tag_label  = system_tag or "default"
        status     = "🔴 FAIL" if overall_rate < (warn_threshold - 10) else "⚠️ WARN"

        subject = (
            f"{status} LTVF Alert — {tag_label}: "
            f"{overall_rate:.1f}% match rate (threshold {warn_threshold}%)"
        )

        body_text = (
            f"LTVF Dashboard — Automated Alert\n"
            f"{'=' * 50}\n\n"
            f"System Tag   : {tag_label}\n"
            f"Match Rate   : {overall_rate:.1f}%\n"
            f"Warn Threshold: {warn_threshold}%\n\n"
            f"The overall match rate has dropped below the warn threshold.\n"
            f"Please review failing test cases in the LTVF Cloud Dashboard.\n\n"
            f"This alert was triggered by a scheduled SharePoint fetch.\n"
        )

        body_html = f"""
        <html><body style="font-family:sans-serif;font-size:14px;color:#1e293b;">
          <div style="max-width:520px;margin:0 auto;padding:24px;
                      border:1px solid #e2e8f0;border-radius:8px;">
            <h2 style="color:#dc2626;margin-top:0;">⚠️ LTVF Match Rate Alert</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <tr><td style="padding:6px 0;color:#64748b;">System Tag</td>
                  <td style="padding:6px 0;font-weight:600;">{tag_label}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Match Rate</td>
                  <td style="padding:6px 0;font-weight:700;color:#dc2626;">{overall_rate:.1f}%</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Warn Threshold</td>
                  <td style="padding:6px 0;">{warn_threshold}%</td></tr>
            </table>
            <p style="color:#475569;">
              The overall match rate has dropped below the configured warn threshold.
              Please review failing test cases in the LTVF Cloud Dashboard.
            </p>
            <p style="font-size:12px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
              This alert was triggered by a scheduled SharePoint fetch.
            </p>
          </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = ", ".join(recipients)
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipients, msg.as_string())

        log.info(
            "alert_sent system=%s rate=%.1f warn_threshold=%d recipients=%s",
            tag_label, overall_rate, warn_threshold, recipients,
        )

    except Exception as exc:
        # Never let alerting break the main response flow
        log.warning("alert_failed system=%s error=%s", system_tag, exc)
