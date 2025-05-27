
const getEmailTemplate = (templateName, data) => {
    const getGradientColors = (orgName) => {
        const colors = [
            ['#667eea', '#764ba2'],
            ['#f093fb', '#f5576c'],
            ['#4facfe', '#00f2fe'],
            ['#43e97b', '#38f9d7'],
            ['#fa709a', '#fee140']
        ];
        const hash = orgName ? orgName.length % colors.length : 0;
        return colors[hash];
    };
    const [color1, color2] = getGradientColors(data?.organizationName);

    const header = `
    <!DOCTYPE html>
    <html>
     <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Contact Inquiry</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
      .email-container { max-width: 700px; margin: 0 auto; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15); }
      .header { background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%); padding: 40px 30px; text-align: center; }
      .header h1 { color: white; font-size: 2.5rem; font-weight: 700; margin-bottom: 8px; }
      .header p { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
      .content { padding: 40px 30px; }
      .contact-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 20px; padding: 30px; border: 1px solid #e2e8f0; position: relative; }
      .contact-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${color1}, ${color2}); }
      .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin-bottom: 25px; }
      .contact-field { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
      .field-label { font-size: 0.875rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
      .field-value { font-size: 1.1rem; font-weight: 500; color: #1e293b; }
      .message-field { grid-column: 1 / -1; background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
      .message-content { background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid ${color1}; color: #374151; white-space: pre-wrap; }
      .footer { text-align: center; padding: 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
    <body>
        <div class="email-container">
          <div class="header">
                <h1>✨ New Contact</h1>
                <p>Fresh inquiry received</p>
          </div>
    `;

    const footer = `
       <div class="footer">
            <p>
                © ${new Date().getFullYear()} Your Company Name. All rights reserved.
            </p>
        </div>
    </div>
    </body>
    </html>
    `;

    // Select template based on name
    let content = "";
    console.log("🚀 ~ getEmailTemplate ~ data:", data);

    switch (templateName) {
        case "contact":
            content = contactTemplate(data);
            break;
        default:
            content = `<p>No template found for "${templateName}"</p>`;
    }

    return header + content + footer;
};

/**
 * Email contact template
 */
const contactTemplate = (data) => {
    return `
      <div class="content">
        <div class="contact-card">
          <div class="contact-grid">
            <div class="contact-field">
              <div class="field-label">First Name</div>
              <div class="field-value">
                ${data?.firstName || 'Not provided'}
              </div>
            </div>
            <div class="contact-field">
              <div class="field-label">Last Name</div>
              <div class="field-value">${data?.lastName || 'Not provided'}</div>
            </div>
            <div class="contact-field">
              <div class="field-label">Phone Number</div>
              <div class="field-value">${data?.phone || 'Not provided'}</div>
            </div>
            <div class="contact-field">
              <div class="field-label">Email Address</div>
              <div class="field-value">${data?.email || 'Not provided'}</div>
            </div>
            <div class="contact-field">
              <div class="field-label">Organization</div>
              <div class="field-value">
                ${data?.organizationName || 'Not provided'}
              </div>
            </div>
            <div class="message-field">
              <div class="field-label">Message</div>
              <div class="message-content">
                ${data?.message || 'No message provided'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
};

module.exports = { getEmailTemplate };