#!/usr/bin/env python3
"""
Script to check and update user levels based on upgrade transactions.
Reads members.csv and filtered_by_fee.csv to determine correct levels.
"""

import csv
import sys
from collections import defaultdict
from typing import Dict, List, Tuple

# Level prices in USDT (from constants.ts)
LEVEL_PRICES = {
    1: 130,
    2: 150,
    3: 200,
    4: 250,
    5: 300,
    6: 350,  # Platinum
    7: 400,
    8: 450,
    9: 500,
    10: 550,
    11: 600,
    12: 650,
    13: 700,
    14: 750,
    15: 800,
    16: 850,
    17: 900,
    18: 950,
    19: 1000,
}

# Level names
LEVEL_NAMES = {
    1: "Warrior",
    2: "Bronze",
    3: "Silver",
    4: "Gold",
    5: "Elite",
    6: "Platinum",
    7: "Master",
    8: "Diamond",
    9: "Grandmaster",
    10: "Starlight",
    11: "Epic",
    12: "Legend",
    13: "Supreme King",
    14: "Peerless King",
    15: "Glory King",
    16: "Legendary",
    17: "Supreme",
    18: "Mythic",
    19: "Mythic Apex",
}

# Create reverse mapping: price -> level
PRICE_TO_LEVEL = {price: level for level, price in LEVEL_PRICES.items()}


def normalize_address(addr: str) -> str:
    """Normalize wallet address to lowercase for comparison."""
    return addr.lower().strip() if addr else ""


def parse_amount(amount_str: str) -> float:
    """Parse amount string to float."""
    try:
        return float(amount_str.strip())
    except (ValueError, AttributeError):
        return 0.0


def is_usdt_token(token_str: str) -> bool:
    """Check if token string is USDT (handles encoding variations)."""
    if not token_str:
        return False
    token_lower = token_str.lower()
    # Handle various encodings of USD₮0
    return "usd" in token_lower and ("₮" in token_str or "t" in token_lower) and "0" in token_str


def read_members_csv(filename: str) -> Dict[str, Dict]:
    """Read members.csv and return dict of wallet_address -> member data."""
    members = {}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                wallet = normalize_address(row.get('wallet_address', ''))
                if wallet:
                    members[wallet] = {
                        'wallet_address': row.get('wallet_address', ''),
                        'referrer_wallet': row.get('referrer_wallet', ''),
                        'current_level': int(row.get('current_level', 0)) if row.get('current_level') else 0,
                        'activation_sequence': row.get('activation_sequence', ''),
                        'activation_time': row.get('activation_time', ''),
                        'total_nft_claimed': row.get('total_nft_claimed', ''),
                    }
        print(f"✓ Read {len(members)} members from {filename}")
    except FileNotFoundError:
        print(f"✗ Error: {filename} not found")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error reading {filename}: {e}")
        sys.exit(1)
    return members


def read_transactions_csv(filename: str) -> List[Dict]:
    """Read filtered_by_fee.csv and return list of upgrade transactions."""
    transactions = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                method = row.get('method', '').strip()
                if method.lower() == 'upgrade':
                    transactions.append({
                        'tx_hash': row.get('tx_hash', ''),
                        'method': method,
                        'from_addr': normalize_address(row.get('from_addr', '')),
                        'to_addr': normalize_address(row.get('to_addr', '')),
                        'amount': parse_amount(row.get('amount', '0')),
                        'token': row.get('token', ''),
                        'block': row.get('block', ''),
                        'age': row.get('age', ''),
                    })
        print(f"✓ Read {len(transactions)} upgrade transactions from {filename}")
    except FileNotFoundError:
        print(f"✗ Error: {filename} not found")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error reading {filename}: {e}")
        sys.exit(1)
    return transactions


def calculate_max_level(wallet: str, transactions: List[Dict]) -> int:
    """
    Calculate the maximum level a user has upgraded to based on their transactions.
    Returns the highest level found, or 0 if no valid upgrades found.
    """
    max_level = 0
    upgrade_amounts = []
    
    for tx in transactions:
        # Check if transaction is from this wallet
        if tx['from_addr'] != wallet:
            continue
        
        # Check if token is USDT
        if not is_usdt_token(tx['token']):
            continue
        
        amount = tx['amount']
        # Check if amount matches a level price
        if amount in PRICE_TO_LEVEL:
            level = PRICE_TO_LEVEL[amount]
            upgrade_amounts.append((amount, level))
            if level > max_level:
                max_level = level
    
    return max_level


def main():
    print("=" * 60)
    print("Beehive Level Checker")
    print("=" * 60)
    print()
    
    # Read CSV files
    members = read_members_csv('members.csv')
    transactions = read_transactions_csv('filtered_by_fee.csv')
    
    # Calculate correct levels for each member
    print("\nAnalyzing upgrade transactions...")
    wallet_levels = {}
    for wallet, member_data in members.items():
        max_level = calculate_max_level(wallet, transactions)
        wallet_levels[wallet] = max_level
    
    # Create updated members CSV
    print("\nCreating members_update.csv...")
    updated_members = []
    wrong_levels = []
    
    for wallet, member_data in members.items():
        current_level = member_data['current_level']
        correct_level = wallet_levels[wallet]
        
        # If no upgrade found, keep current level (might be level 1 from registration)
        if correct_level == 0:
            correct_level = current_level if current_level > 0 else 1
        
        # Update member data with correct level
        updated_member = member_data.copy()
        updated_member['current_level'] = correct_level
        updated_members.append(updated_member)
        
        # Track wrong levels
        if current_level != correct_level:
            wrong_levels.append({
                'wallet_address': member_data['wallet_address'],
                'wrong_level': current_level,
                'correct_level': correct_level,
                'level_name': LEVEL_NAMES.get(correct_level, f"Level {correct_level}"),
            })
    
    # Write members_update.csv
    if updated_members:
        fieldnames = ['wallet_address', 'referrer_wallet', 'current_level', 
                     'activation_sequence', 'activation_time', 'total_nft_claimed']
        with open('members_update.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_members)
        print(f"✓ Created members_update.csv with {len(updated_members)} members")
    
    # Write wrong_levels.csv
    if wrong_levels:
        with open('wrong_levels.csv', 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['wallet_address', 'wrong_level', 'correct_level', 'level_name']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(wrong_levels)
        print(f"✓ Created wrong_levels.csv with {len(wrong_levels)} users with incorrect levels")
    else:
        print("✓ No users with wrong levels found")
    
    # Print summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total members: {len(members)}")
    print(f"Members with wrong levels: {len(wrong_levels)}")
    print(f"Members with correct levels: {len(members) - len(wrong_levels)}")
    
    if wrong_levels:
        print("\nTop 10 users with wrong levels:")
        for i, user in enumerate(wrong_levels[:10], 1):
            print(f"  {i}. {user['wallet_address'][:20]}... | "
                  f"Wrong: Level {user['wrong_level']} | "
                  f"Correct: Level {user['correct_level']} ({user['level_name']})")
    
    print("\n✓ Done!")


if __name__ == '__main__':
    main()

