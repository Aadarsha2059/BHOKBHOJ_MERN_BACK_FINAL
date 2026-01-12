#!/bin/bash
# Bash script to install mkcert and generate trusted SSL certificates for Backend (macOS/Linux)

echo "🔐 Setting up mkcert for Backend (Node.js/Express)"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Install mkcert
echo ""
echo "📦 Step 1: Installing mkcert..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        brew install mkcert
    else
        echo "❌ Homebrew not found. Please install Homebrew first: https://brew.sh"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y libnss3-tools
        curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
        chmod +x mkcert-v*-linux-amd64
        sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
    elif command -v yum &> /dev/null; then
        sudo yum install -y nss-tools
        curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
        chmod +x mkcert-v*-linux-amd64
        sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
    else
        echo "❌ Unsupported Linux distribution. Please install mkcert manually."
        exit 1
    fi
else
    echo "❌ Unsupported operating system"
    exit 1
fi

# Step 2: Install local CA
echo ""
echo "🔐 Step 2: Installing mkcert root CA..."
mkcert -install
if [ $? -ne 0 ]; then
    echo "   ⚠️  Root CA may already be installed (this is OK)"
fi
echo "   ✅ Root CA ready"

# Step 3: Create ssl directory
echo ""
echo "📁 Step 3: Creating SSL directory..."
SSL_DIR="$(dirname "$0")/ssl"
mkdir -p "$SSL_DIR"
echo "   ✅ SSL directory ready"

# Step 4: Generate certificates
echo ""
echo "🔑 Step 4: Generating SSL certificates for localhost..."
mkcert -cert-file "$SSL_DIR/localhost+1.pem" -key-file "$SSL_DIR/localhost+1-key.pem" localhost 127.0.0.1 ::1

if [ $? -ne 0 ]; then
    echo "   ❌ Failed to generate certificates"
    exit 1
fi

# Rename to match expected filenames
cp "$SSL_DIR/localhost+1.pem" "$SSL_DIR/cert.pem"
cp "$SSL_DIR/localhost+1-key.pem" "$SSL_DIR/key.pem"

echo "   ✅ Certificates generated successfully"
echo "   📄 Certificate: $SSL_DIR/cert.pem"
echo "   🔑 Private Key: $SSL_DIR/key.pem"

echo ""
echo "✅ Setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo "🚀 Your backend will now use trusted SSL certificates"
echo "   Access at: https://localhost:5443 (no browser warnings!)"
echo "═══════════════════════════════════════════════════════════"
echo ""
