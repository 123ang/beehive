#!/bin/bash
# Script to create/fix MySQL user for beehive

echo "🔧 Fixing MySQL user 'beehive_user'..."
echo ""

# Read MySQL root password (optional, can be empty)
read -sp "Enter MySQL root password (press Enter if no password): " ROOT_PASS
echo ""

# Create user and grant permissions
mysql -u root ${ROOT_PASS:+-p$ROOT_PASS} << EOF
-- Check if user exists
SELECT 'Checking if user exists...' as status;
SELECT user, host FROM mysql.user WHERE user='beehive_user';

-- Create user if it doesn't exist, or reset password if it does
CREATE USER IF NOT EXISTS 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';

-- If user exists, reset password
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';

-- Grant all privileges on beehive database
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SELECT 'User created/updated successfully!' as status;
SHOW GRANTS FOR 'beehive_user'@'localhost';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MySQL user fixed!"
    echo ""
    echo "Testing connection..."
    mysql -u beehive_user -p920214@Ang beehive -e "SELECT 'Connection successful!' as status;"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Connection test passed!"
        echo ""
        echo "Now restart the API:"
        echo "  pm2 restart beehive-api"
    else
        echo ""
        echo "❌ Connection test failed. Check the password."
    fi
else
    echo ""
    echo "❌ Failed to create/fix user. Check MySQL root access."
fi

