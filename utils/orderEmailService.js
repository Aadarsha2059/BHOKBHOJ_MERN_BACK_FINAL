const nodemailer = require('nodemailer');
const { validateEmailConfig, getAppPasswordInstructions } = require('./emailConfigValidator');
const { envConfig } = require('../config/envConfig');

/**
 * Get email transporter (reuses same logic as security notifications)
 */
const getTransporter = async () => {
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const validation = validateEmailConfig();
      
      if (!validation.valid) {
        console.warn('⚠️  Email configuration invalid, using Ethereal Email for order confirmation');
        const etherealAccount = await nodemailer.createTestAccount();
        return {
          transporter: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: envConfig.email.port,
            secure: envConfig.email.secure,
            auth: {
              user: etherealAccount.user,
              pass: etherealAccount.pass
            },
            tls: {
              rejectUnauthorized: false
            }
          }),
          isEthereal: true,
          etherealAccount
        };
      }

      const emailUser = validation.emailUser;
      const emailPass = validation.emailPass;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: envConfig.email.host,
        port: envConfig.email.port,
        secure: envConfig.email.secure,
        auth: {
          user: emailUser,
          pass: emailPass
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();
      
      return {
        transporter,
        isEthereal: false,
        etherealAccount: null
      };
    }

    const etherealAccount = await nodemailer.createTestAccount();
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: envConfig.email.port,
        secure: envConfig.email.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      isEthereal: true,
      etherealAccount
    };
  } catch (error) {
    console.error('❌ Error creating email transporter for order confirmation:', error.message);
    return null;
  }
};

/**
 * Format currency to NPR format
 */
const formatCurrency = (amount) => {
  return `NPR ${Number(amount).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (user, order) => {
  try {
    const emailConfig = await getTransporter();
    if (!emailConfig) {
      console.error('❌ Email transporter not available for order confirmation');
      return { success: false, error: 'Email transporter not available' };
    }

    const { transporter, isEthereal, etherealAccount } = emailConfig;
    const baseUrl = envConfig.urls.baseUrl;
    const customerName = user.fullname || user.username || 'Customer';
    const orderId = order._id.toString();

    // Build order items HTML rows
    const orderItemsRows = order.items.map(item => {
      const productImage = item.productId?.filepath 
        ? `${baseUrl}/uploads/${item.productId.filepath.replace(/^uploads\//, '')}`
        : '';
      
      const productName = item.productName || item.productId?.name || 'Unknown Product';
      const quantity = item.quantity || 1;
      const price = formatCurrency(item.price || 0);
      const restaurantName = item.restaurantName || item.productId?.restaurantId?.name || 'N/A';

      return `
        <tr style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb;">
            ${productImage 
              ? `<img src="${productImage}" alt="${productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;" />`
              : '<span style="color: #9ca3af; font-size: 12px;">No image</span>'
            }
          </td>
          <td style="padding: 12px; border-right: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${productName}</td>
          <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb; color: #111827;">${quantity}</td>
          <td style="padding: 12px; text-align: right; border-right: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${price}</td>
          <td style="padding: 12px; color: #6b7280; font-size: 14px;">${restaurantName}</td>
        </tr>
      `;
    }).join('');

    // Calculate totals
    const subtotal = order.subtotal || 0;
    const deliveryFee = order.deliveryFee || 0;
    const tax = order.tax || 0;
    const total = order.totalAmount || 0;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - BHOKBHOJ</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">🍽️ BHOKBHOJ</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">Order Confirmation</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #111827;">
                        Thank you for your order, ${customerName}!
                      </p>
                      
                      <p style="margin: 0 0 30px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                        Your order <strong style="color: #111827;">#${orderId}</strong> has been placed successfully.
                      </p>

                      <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                        Order Summary:
                      </h2>

                      <!-- Order Items Table -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f3f4f6;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #374151;">Image</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #374151;">Product</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #374151;">Qty</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #374151;">Price</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; font-weight: 600; color: #374151;">Restaurant</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${orderItemsRows}
                        </tbody>
                      </table>

                      <!-- Order Totals -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Subtotal:</td>
                          <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 15px; font-weight: 500;">${formatCurrency(subtotal)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Delivery Fee:</td>
                          <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 15px; font-weight: 500;">${formatCurrency(deliveryFee)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Tax (5%):</td>
                          <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 15px; font-weight: 500;">${formatCurrency(tax)}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                          <td style="padding: 12px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total:</td>
                          <td style="padding: 12px 0 0 0; text-align: right; color: #111827; font-size: 18px; font-weight: 700;">${formatCurrency(total)}</td>
                        </tr>
                      </table>

                      <!-- Delivery Information -->
                      ${order.deliveryAddress ? `
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #14b8a6;">
                          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Delivery Address:</p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                            ${order.deliveryAddress.street || ''}${order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}${order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ''}${order.deliveryAddress.zipCode ? ` ${order.deliveryAddress.zipCode}` : ''}${order.deliveryAddress.country ? `, ${order.deliveryAddress.country}` : ''}
                          </p>
                        </div>
                      ` : ''}

                      ${order.estimatedDeliveryTime ? `
                        <p style="margin: 0 0 30px 0; font-size: 14px; color: #6b7280;">
                          <strong style="color: #374151;">Estimated Delivery Time:</strong> 
                          ${new Date(order.estimatedDeliveryTime).toLocaleString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      ` : ''}

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                        If you have any questions, please contact us at 
                        <a href="mailto:${process.env.EMAIL_USER || 'support@bhokbhoj.com'}" style="color: #14b8a6; text-decoration: none; font-weight: 500;">${process.env.EMAIL_USER || 'support@bhokbhoj.com'}</a>
                      </p>
                      <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af;">
                        © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"BHOKBHOJ" <${isEthereal ? (etherealAccount?.user || envConfig.email.from) : (envConfig.email.user || envConfig.email.from)}>`,
      to: user.email,
      subject: `Order Confirmation #${orderId} - BHOKBHOJ`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    console.log('\n✅ ORDER CONFIRMATION EMAIL SENT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 Order ID:', orderId);
    console.log('👤 Customer:', customerName);
    console.log('📧 Email:', user.email);
    console.log('💰 Total:', formatCurrency(total));
    
    if (isEthereal && previewUrl) {
      console.log('🌐 Preview URL:', previewUrl);
      console.log('💡 Note: Using Ethereal Email - open preview URL to view email');
    } else {
      console.log('📬 Email sent via Gmail SMTP');
      console.log('📬 Message ID:', info.messageId);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { 
      success: true, 
      messageId: info.messageId, 
      previewUrl,
      isEthereal 
    };

  } catch (error) {
    console.error('\n❌ ORDER CONFIRMATION EMAIL ERROR:');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Order ID:', order._id.toString());
    console.error('Customer Email:', user.email);
    
    if (error.code === 'EENVELOPE' && error.message && error.message.includes('Daily user sending limit exceeded')) {
      console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
      console.error('   ⚠️  Gmail daily limit reached. Email will be queued.');
    }
    
    console.error('═══════════════════════════════════════════════════════════════\n');
    
    return { 
      success: false, 
      error: error.message, 
      errorCode: error.code 
    };
  }
};

module.exports = {
  sendOrderConfirmationEmail
};
