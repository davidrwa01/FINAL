# 🚀 Deployment Guide for Smart-KORAFX Backend

## Prerequisites

Before deploying, ensure you have:
- MongoDB database (Atlas, mLab, or self-hosted)
- Node.js hosting (Heroku, DigitalOcean, AWS, Railway, etc.)
- Domain name (optional but recommended)

---

## 🌐 Option 1: Deploy to Heroku

### 1. Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
heroku create smart-korafx-backend
```

### 4. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/smart-korafx"
heroku config:set SESSION_SECRET="your-random-secret-key-here"
heroku config:set ADMIN_EMAIL="admin@smartkorafx.com"
heroku config:set ADMIN_PASSWORD="YourSecurePassword123"
```

### 5. Deploy

```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### 6. Initialize Database

```bash
heroku run node scripts/init-db.js
```

### 7. Open Your App

```bash
heroku open
```

---

## 🚂 Option 2: Deploy to Railway

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize Project

```bash
railway init
```

### 4. Add MongoDB

```bash
railway add mongodb
```

### 5. Deploy

```bash
railway up
```

Railway will automatically detect your Node.js app and deploy it.

---

## 🌊 Option 3: Deploy to DigitalOcean

### 1. Create Droplet

- Choose Ubuntu 22.04 LTS
- Select plan ($6/month or higher)
- Add SSH key

### 2. Connect to Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
npm install -g pm2
```

### 4. Install MongoDB

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

### 5. Clone & Setup Application

```bash
cd /var/www
git clone <your-repo-url> smart-korafx
cd smart-korafx
npm install
```

### 6. Configure Environment

```bash
nano .env
```

Add your production variables:

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/smart-korafx
SESSION_SECRET=your-super-secret-session-key
ADMIN_EMAIL=admin@smartkorafx.com
ADMIN_PASSWORD=YourSecurePassword123
```

### 7. Initialize Database

```bash
node scripts/init-db.js
```

### 8. Start with PM2

```bash
pm2 start server.js --name smart-korafx
pm2 save
pm2 startup
```

### 9. Configure Nginx (Optional)

```bash
apt-get install nginx

nano /etc/nginx/sites-available/smart-korafx
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/smart-korafx /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 10. SSL Certificate (Recommended)

```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 🗄️ MongoDB Atlas Setup

### 1. Create Account

Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

### 2. Create Cluster

- Choose free tier (M0)
- Select region closest to your users
- Create cluster

### 3. Configure Access

**Database Access:**
- Create database user
- Set username and password
- Add database user

**Network Access:**
- Add IP address: `0.0.0.0/0` (allow from anywhere)
- Or add specific IPs for better security

### 4. Get Connection String

- Click "Connect"
- Choose "Connect your application"
- Copy connection string
- Replace `<password>` with your password

Example:
```
mongodb+srv://admin:YourPassword@cluster0.abc123.mongodb.net/smart-korafx?retryWrites=true&w=majority
```

---

## 🔒 Production Checklist

### Security

- [ ] Change default admin password
- [ ] Use strong SESSION_SECRET (min 32 random characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure cookies (auto-enabled in production)
- [ ] Whitelist allowed CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB network access
- [ ] Add rate limiting to authentication endpoints

### Configuration

- [ ] Set NODE_ENV=production
- [ ] Configure proper MONGODB_URI
- [ ] Set up backup strategy for database
- [ ] Configure file upload limits
- [ ] Set up logging system
- [ ] Configure error monitoring (Sentry, etc.)

### Testing

- [ ] Test registration flow
- [ ] Test login/logout
- [ ] Test admin approval
- [ ] Test subscription flow
- [ ] Test trial limits
- [ ] Test payment submission
- [ ] Test admin panel

### Monitoring

- [ ] Set up uptime monitoring
- [ ] Configure error alerts
- [ ] Monitor database performance
- [ ] Track API response times
- [ ] Monitor disk space

---

## 🔧 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | Yes | development | Environment mode |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `ADMIN_EMAIL` | Yes | - | Default admin email |
| `ADMIN_PASSWORD` | Yes | - | Default admin password |
| `CURRENCY_API_URL` | No | exchangerate-api | USD to RWF API |
| `UPLOAD_DIR` | No | ./uploads | Upload directory |
| `MAX_FILE_SIZE` | No | 5242880 | Max file size (bytes) |
| `MTN_USSD_CODE` | No | *182*8*1*583894# | MTN USSD code |
| `PAYMENT_RECEIVER_NAME` | No | David | Payment receiver name |
| `FREE_TRIAL_SIGNALS_PER_DAY` | No | 2 | Trial limit |
| `TIMEZONE` | No | Africa/Kigali | User timezone |
| `CORS_ORIGIN` | No | http://localhost:3000 | Allowed CORS origin |

---

## 📊 Monitoring Commands

### PM2 (DigitalOcean/VPS)

```bash
# View logs
pm2 logs smart-korafx

# Monitor resources
pm2 monit

# Restart app
pm2 restart smart-korafx

# Stop app
pm2 stop smart-korafx

# View status
pm2 status
```

### Heroku

```bash
# View logs
heroku logs --tail

# Check status
heroku ps

# Restart
heroku restart
```

---

## 🔄 Updates & Maintenance

### Updating Code

**Heroku:**
```bash
git add .
git commit -m "Update description"
git push heroku main
```

**DigitalOcean/VPS:**
```bash
cd /var/www/smart-korafx
git pull
npm install
pm2 restart smart-korafx
```

### Database Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/smart-korafx" --out=/backups/$(date +%Y%m%d)

# Restore MongoDB
mongorestore --uri="mongodb://localhost:27017/smart-korafx" /backups/20260130
```

---

## 🆘 Troubleshooting

### App Won't Start

1. Check logs: `pm2 logs` or `heroku logs --tail`
2. Verify environment variables
3. Check MongoDB connection
4. Ensure port is not in use

### Database Connection Issues

1. Verify MONGODB_URI is correct
2. Check network access in MongoDB Atlas
3. Verify database user credentials
4. Check firewall rules

### Session Issues

1. Clear browser cookies
2. Check SESSION_SECRET is set
3. Verify MongoDB session store connection

---

## 📞 Support

For deployment issues, check:
- MongoDB Atlas docs: https://docs.atlas.mongodb.com/
- Heroku docs: https://devcenter.heroku.com/
- DigitalOcean docs: https://docs.digitalocean.com/

---

**Deployment Guide v1.0** | Smart-KORAFX Backend
