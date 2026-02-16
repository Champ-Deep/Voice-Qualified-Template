# Eleven Labs API Test Results

## Test Date: February 16, 2026

### ✅ API Connection Test - SUCCESS

#### Test Details
- **API Key**: Verified and working
- **Agent ID**: `agent_3501kf4e3ak0eqkrxg1rttttk881`
- **Agent Name**: Champ Qualifier
- **Phone Number ID**: `phnum_4901kg4yjvgpetqbeknvhgm1stk4`
- **Phone Number**: +16592504291

#### Agents Endpoint Test
```bash
GET https://api.elevenlabs.io/v1/convai/agents
```
**Result**: ✅ SUCCESS - Retrieved 5 agents including the target agent

### ✅ Outbound Call Test - SUCCESS

#### Correct Endpoint Discovered
```
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
```

#### Request Format
```json
{
  "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
  "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
  "to_number": "+919098474926",
  "conversation_initiation_client_data": {
    "type": "conversation_initiation_client_data",
    "dynamic_variables": {
      "lead_name": "Test User",
      "leadId": "lead_test1234",
      "company": "Test Company",
      "email": "test@example.com"
    }
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Success",
  "conversation_id": "conv_6901khjvd8ztemgskm5y3gztrhbe",
  "callSid": "CAf87258ead9bf2f4e8bbfad6e5a413809"
}
```

**Result**: ✅ SUCCESS - Call initiated successfully

### API Endpoints Discovered

#### Outbound Calling
1. `/v1/convai/twilio/outbound-call` - Initiate outbound call via Twilio ✅
2. `/v1/convai/batch-calling/submit` - Submit batch calls
3. `/v1/convai/sip-trunk/outbound-call` - Initiate call via SIP trunk
4. `/v1/convai/whatsapp/outbound-call` - Initiate WhatsApp call

#### Conversation Management
1. `/v1/convai/conversations` - List conversations
2. `/v1/convai/conversations/{conversation_id}` - Get conversation details
3. `/v1/convai/conversations/{conversation_id}/audio` - Get conversation audio
4. `/v1/convai/conversations/{conversation_id}/feedback` - Submit feedback

#### Agent Management
1. `/v1/convai/agents` - List agents ✅
2. `/v1/convai/agents/{agent_id}` - Get agent details

#### Phone Numbers
1. `/v1/convai/phone-numbers` - List phone numbers
2. `/v1/convai/phone-numbers/{phone_number_id}` - Get phone number details

## Code Updates Applied

### 1. Updated `src/services/elevenLabsService.ts`

#### Changed `initiateCall()` method:
**From**: `/conversational-ai/calls` ❌
**To**: `/convai/twilio/outbound-call` ✅

#### Changed `getCallStatus()` method:
**From**: `/conversational-ai/calls/{callId}` ❌
**To**: `/convai/conversations/{conversationId}` ✅

#### Changed `getTranscript()` method:
**From**: `/conversational-ai/calls/{callId}/transcript` ❌
**To**: `/convai/conversations/{conversationId}` ✅

Added transformation logic to convert Eleven Labs transcript format to our application format.

## Agent Configuration

The agent "Champ Qualifier" is configured with:
- **Voice Model**: eleven_flash_v2
- **Voice ID**: 56bWURjYFHyYyVf490Dp
- **Language**: English (en)
- **Max Call Duration**: 600 seconds (10 minutes)
- **Turn Timeout**: 7.0 seconds
- **Provider**: Twilio
- **Knowledge Base**: 5 documents loaded
  - LAKE_B2B_COMPANY_OVERVIEW
  - CHAMP_FRAMEWORK_GUIDE
  - COMMON_OBJECTIONS_RESPONSES
  - SERVICES_PRODUCTS_FAQ
  - CALL_FLOW_EXAMPLES

## Dynamic Variables Support

The agent supports the following dynamic variables:
- `lead_name` - Lead's full name
- `leadId` - Unique lead identifier
- `company` - Company name
- `email` - Contact email

These variables are passed via `conversation_initiation_client_data` and are available to the AI agent during the call.

## Webhook Configuration

The agent has a post-call webhook configured:
- **Webhook ID**: cb2f0eb9b75646469fec1b09e9de8de1
- **Events**: transcript, call_initiation_failure
- **Send Audio**: false

## Next Steps

1. ✅ API endpoint corrected in `elevenLabsService.ts`
2. ✅ Conversation ID handling updated
3. ✅ Transcript parsing updated to match Eleven Labs format
4. ⏳ Test full application flow with Docker
5. ⏳ Verify webhook receives transcript after call completion
6. ⏳ Test Redis caching of lead data and transcripts

## Testing Recommendations

1. **Local Testing**:
   ```bash
   npm run dev
   ```

2. **Docker Testing**:
   ```bash
   docker-compose up -d
   ```

3. **Test Flow**:
   - Submit lead form
   - Verify call is initiated
   - Check Redis for lead data
   - Wait for call completion
   - Verify transcript is received via webhook
   - Check transcript display in UI

## Important Notes

- The API uses `xi-api-key` in the header (not `Authorization`)
- Phone numbers must be in E.164 format (e.g., +919098474926)
- The agent is configured with a Twilio phone number (+16592504291)
- Conversation IDs are returned upon successful call initiation
- Transcripts are available after call completion via webhook or API query
