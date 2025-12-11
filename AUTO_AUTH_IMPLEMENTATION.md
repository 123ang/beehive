# Automatic Wallet Authentication Implementation

## Problem
When users connect their wallet, the system wasn't automatically authenticating them. This meant:
- The dashboard couldn't fetch member data from the database
- Users saw "Become a Member" even if they already had a level
- BCC balance, referral network, and rewards weren't displayed

## Solution
Implemented automatic authentication flow that:
1. Detects when a wallet connects
2. Automatically signs a message to verify wallet ownership
3. Gets a JWT token for API access
4. Stores the token for subsequent API calls
5. Reloads the page to fetch member data

## Implementation

### New Component: `AutoAuth.tsx`
Located at: `apps/web/src/components/web3/AutoAuth.tsx`

**Features:**
- Automatically triggers when wallet connects
- Requests nonce from API
- Prompts user to sign message (SIWE - Sign-In with Ethereum)
- Verifies signature and gets JWT token
- Stores token in localStorage
- Reloads page to fetch authenticated data
- Handles user rejection gracefully
- Clears token when wallet disconnects

### Integration
Added to `Providers.tsx`:
```tsx
<AutoAuth />
<WalletRedirect />
```

## User Flow

### Before (Broken):
1. User connects wallet ❌
2. Dashboard loads but can't fetch data (no auth token)
3. Shows "Become a Member" even for existing members
4. No BCC balance, rewards, or network data shown

### After (Fixed):
1. User connects wallet ✅
2. AutoAuth triggers automatically
3. User signs message to verify wallet ownership
4. JWT token obtained and stored
5. Page reloads with authentication
6. Dashboard fetches member data from database
7. Shows actual membership level, BCC balance, rewards, network

## API Authentication Flow

### 1. Get Nonce
```
POST /api/auth/nonce
Body: { address: "0x..." }
Response: { message: "...", nonce: "..." }
```

### 2. Sign Message
User signs the message with their wallet (MetaMask, etc.)

### 3. Verify Signature
```
POST /api/auth/verify
Body: { address: "0x...", message: "...", signature: "0x..." }
Response: { token: "jwt_token", user: {...} }
```

### 4. Use Token
All subsequent API calls include:
```
Authorization: Bearer <jwt_token>
```

## Dashboard Data Display

Once authenticated, the dashboard shows:

### If User is a Member (has level):
- ✅ **Membership Level Card**: Current NFT level
- ✅ **BCC Balance Card**: Transferable + Locked BCC
- ✅ **Referral Network Card**: Direct referrals + Team size
- ✅ **Rewards Center**: Total rewards + Claimable rewards
- ✅ **Referral Link**: Share link to invite others

### If User is NOT a Member:
- Shows "Become a Member" card
- Button to view membership levels
- Prompts to purchase Level 1 to start

## Technical Details

### Token Storage
- Stored in localStorage as `beehive_token`
- Automatically included in all API requests
- Cleared on wallet disconnect

### Token Validation
- JWT tokens expire after a set time
- AutoAuth checks if existing token is valid
- Only re-authenticates if needed

### Error Handling
- User rejects signature: Silently fails, can retry later
- Network errors: Logged to console
- Invalid token: Prompts re-authentication

## Security

### SIWE (Sign-In with Ethereum)
- Uses industry-standard wallet authentication
- Message includes nonce to prevent replay attacks
- Signature verified on server using `viem`
- Nonce cleared after successful verification

### JWT Tokens
- Signed with secret key
- Include user ID and wallet address
- Expire after set duration
- Verified on every API request

## Benefits

1. **Seamless UX**: Users don't need to manually authenticate
2. **Secure**: Uses wallet signatures for verification
3. **Persistent**: Token stored for future visits
4. **Automatic**: Works in background without user intervention
5. **Graceful**: Handles errors and rejections properly

## Future Enhancements

Potential improvements:
- Add visual feedback during authentication
- Show toast notifications for auth status
- Implement token refresh mechanism
- Add remember me option
- Support multiple wallets per user
- Add session management dashboard

## Testing

To test the authentication flow:
1. Clear localStorage (to remove any existing tokens)
2. Connect wallet
3. Sign the message when prompted
4. Page should reload
5. Dashboard should show member data if you have a level

## Troubleshooting

### Dashboard shows "Become a Member" but I have a level:
- Check browser console for errors
- Clear localStorage and reconnect wallet
- Ensure wallet address matches database records
- Verify API is running and accessible

### Authentication keeps failing:
- Check API server is running
- Verify database connection
- Check wallet address is correct format
- Look for errors in browser console

### Token not persisting:
- Check localStorage is enabled
- Verify no browser extensions blocking storage
- Check for console errors

## Conclusion

The automatic authentication system now properly:
- ✅ Detects wallet connection
- ✅ Signs message to verify ownership
- ✅ Gets JWT token for API access
- ✅ Fetches member data from database
- ✅ Displays actual membership info
- ✅ Shows BCC balance, rewards, and network
- ✅ Handles errors gracefully

Users can now connect their wallet and immediately see their membership data if they exist in the database!

