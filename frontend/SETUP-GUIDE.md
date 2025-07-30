# 🚀 Frontier Dashboard Setup Guide

## Option 1: Install Node.js (Recommended for Full Features)

### Step 1: Download Node.js
1. Go to: https://nodejs.org/en/download/
2. Download "LTS" version for Windows (20.x.x)
3. Run the installer (.msi file)
4. Follow the installation wizard (accept all defaults)
5. Restart your terminal/PowerShell

### Step 2: Verify Installation
Open a new PowerShell window and run:
```powershell
node --version
npm --version
```
You should see version numbers like v20.x.x and 10.x.x

### Step 3: Install Dependencies and Run
```powershell
cd C:\Users\kenne\Frontier\frontend
npm install
npm run dev
```

The dashboard will open at: http://localhost:3001

---

## Option 2: Quick Preview with Python (If Available)

If you have Python installed, you can serve the HTML demo:

```powershell
# Check if Python is available
python --version

# If Python is available, serve the demo
cd C:\Users\kenne\Frontier\frontend
python -m http.server 8080
```

Then open: http://localhost:8080/demo-preview.html

---

## Option 3: Direct File Preview

You can also open the demo directly:
```powershell
start demo-preview.html
```

---

## ✨ What You'll Get With Full Setup:

### Current Demo Preview:
- ✅ Static UI with visual design
- ✅ Basic interactivity (click effects)
- ✅ Simulated chat responses
- ✅ Responsive layout

### Full React Application:
- 🚀 Real-time WebSocket conversations
- 🧠 Redux state management
- 🎙️ Voice input capabilities  
- 📊 Live business metrics
- 🔧 Tool execution framework
- 💾 Persistent user preferences
- 🔐 Authentication system
- 📱 Progressive Web App features

## 🛠️ Troubleshooting

### If Node.js installation fails:
1. Download manually from nodejs.org
2. Right-click installer → "Run as administrator"
3. Restart computer after installation
4. Try alternative installers (Chocolatey, Scoop)

### If npm install fails:
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -r node_modules`
3. Try yarn instead: `npm install -g yarn && yarn install`

### If port 3001 is busy:
The Vite server will automatically try ports 3002, 3003, etc.

---

## 🎯 Next Steps After Setup:

1. **Explore the Interface**: Navigate through features and chat
2. **Test Voice Input**: Click microphone icon (requires HTTPS in production)
3. **Try Dark Mode**: Toggle theme in user preferences
4. **Experiment with Tools**: Execute different business features
5. **Check Analytics**: View usage statistics and insights

## 📞 Need Help?

- Demo working but want full features? → Install Node.js
- Installation issues? → Try Option 2 (Python) or Option 3 (Direct file)
- Want to customize? → Edit React components in src/components/

Ready to transform your business operations with AI? 🚀
