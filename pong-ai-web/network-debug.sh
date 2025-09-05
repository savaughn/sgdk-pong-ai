#!/bin/bash

# Network connectivity troubleshooting script for SGDK Pong AI Web

echo "🔍 SGDK Pong AI - Network Connectivity Troubleshooter"
echo "===================================================="
echo ""

# Get the current IP address
echo "📡 Network Information:"
echo "Current IP addresses:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | while read line; do
    echo "  $line"
done
echo ""

# Check if firewall is blocking connections
echo "🔥 Firewall Status:"
if sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate | grep -q "enabled"; then
    echo "⚠️  macOS Firewall is ENABLED - this might block network connections"
    echo ""
    echo "💡 Solutions:"
    echo "1. Allow Node.js through firewall (recommended):"
    echo "   System Preferences → Security & Privacy → Firewall → Firewall Options"
    echo "   Add Node.js and allow incoming connections"
    echo ""
    echo "2. Temporarily disable firewall (less secure):"
    echo "   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off"
    echo ""
else
    echo "✅ macOS Firewall is disabled - not blocking connections"
fi

# Check if port 3000 is in use
echo "🔌 Port Status:"
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ Port 3000 is in use (server running)"
    echo "Process using port 3000:"
    lsof -i :3000 | head -2
else
    echo "❌ Port 3000 is not in use (server not running)"
fi
echo ""

# Test local connectivity
echo "🧪 Connectivity Test:"
echo "Testing local connection to port 3000..."
if nc -z localhost 3000; then
    echo "✅ Local connection to port 3000 works"
else
    echo "❌ Local connection to port 3000 failed"
fi
echo ""

# Get network interface info
echo "🌐 Network Interface Details:"
echo "Active network interfaces:"
ifconfig | grep -A 1 "flags=.*UP" | grep "inet " | while read line; do
    echo "  $line"
done
echo ""

echo "📋 Quick Fix Commands:"
echo "1. Restart Vite server with explicit host:"
echo "   npm run dev -- --host 0.0.0.0"
echo ""
echo "2. Test connection from another device:"
echo "   http://$(ifconfig en0 | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'):3000"
echo ""
echo "3. If firewall is blocking, allow Node.js:"
echo "   Go to System Preferences → Security & Privacy → Firewall"
echo "   Click 'Firewall Options' and add Node.js with 'Allow incoming connections'"
