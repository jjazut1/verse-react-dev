import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Text, VStack, Spinner, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { emailLinkHandler, EmailLinkParams } from '../services/emailLinkHandler';
import { useSinglePWAWindow } from '../hooks/useSinglePWAWindow';

const EmailLinkRouter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoCloseReason, setAutoCloseReason] = useState<string>('');

  // Single PWA window enforcement for email link processing
  useSinglePWAWindow({
    enabled: true,
    studentEmail: searchParams.get('studentEmail') || '',
    source: 'email_link_router',
    onDuplicateDetected: (action) => {
      console.log('[EmailLinkRouter] 🎯 PWA duplicate action:', action);
      if (action === 'focused_existing') {
        setMessage('Opening existing app window...');
      }
    }
  });

  // Auto-close functionality
  const startAutoClose = (seconds: number, reason: string) => {
    console.log(`[EmailLinkRouter] 🕐 Starting auto-close in ${seconds} seconds: ${reason}`);
    setAutoCloseReason(reason);
    setCountdown(seconds);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          console.log('[EmailLinkRouter] ⏰ Auto-closing window now');
          
          // Try multiple close methods
          try {
            // Method 1: Standard window.close()
            window.close();
            
            // Method 2: If still open after 500ms, try history back
            setTimeout(() => {
              if (!window.closed) {
                console.log('[EmailLinkRouter] 🔄 window.close() failed, trying history.back()');
                window.history.back();
              }
            }, 500);
            
            // Method 3: If still open after 1000ms, try redirect to about:blank
            setTimeout(() => {
              if (!window.closed) {
                console.log('[EmailLinkRouter] 🔄 history.back() failed, redirecting to close page');
                window.location.href = 'about:blank';
              }
            }, 1000);
            
          } catch (error) {
            console.error('[EmailLinkRouter] ❌ Auto-close failed:', error);
          }
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return countdownInterval;
  };

  // Cancel auto-close functionality
  const cancelAutoClose = () => {
    console.log('[EmailLinkRouter] 🛑 User cancelled auto-close');
    setCountdown(null);
    setAutoCloseReason('');
  };

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // CRITICAL DEBUGGING - Always log when EmailLinkRouter is executed
        console.log('[EmailLinkRouter] 🚨 EmailLinkRouter is executing!');
        console.log('[EmailLinkRouter] 🌐 Current URL:', window.location.href);
        console.log('[EmailLinkRouter] 📊 All URL parameters:', Object.fromEntries(searchParams.entries()));
        
        // Support both new (type) and old (mode) parameter formats for compatibility
        const type = (searchParams.get('type') || searchParams.get('mode')) as 'pwa' | 'browser' | 'install';
        const target = searchParams.get('target') as 'dashboard' | 'assignment';
        const token = searchParams.get('token');
        const studentEmail = searchParams.get('studentEmail');
        const source = searchParams.get('source') || 'email';

        // Auto-detect target if missing (for backward compatibility)
        let finalTarget = target;
        if (!finalTarget) {
          finalTarget = token ? 'assignment' : 'dashboard';
        }

        // Add debug info
        const debug = [
          `Type: ${type} (from ${searchParams.get('type') ? 'type' : 'mode'} parameter)`,
          `Target: ${finalTarget} ${!target ? '(auto-detected)' : ''}`,
          `Token: ${token ? 'Present' : 'Missing'}`,
          `Student Email: ${studentEmail || 'Not specified'}`,
          `Source: ${source}`,
          `URL: ${window.location.href}`
        ];
        setDebugInfo(debug);

        if (!type) {
          throw new Error('Missing type parameter (pwa/browser/install) - check email template');
        }

        const params: EmailLinkParams = {
          studentEmail: studentEmail || undefined,
          source,
          mode: type, // Map new 'type' to existing 'mode' for compatibility
          target: finalTarget,
          ...(token && { token })
        };

        console.log('[EmailLinkRouter] Processing email link:', params);
        console.log('[EmailLinkRouter] 🎯 About to process type:', type);
        setMessage(`Processing ${type} link for ${finalTarget}...`);

        // Handle the link based on type
        switch (type) {
          case 'pwa':
            console.log('[EmailLinkRouter] 📱 Processing PWA link...');
            console.log('[EmailLinkRouter] ⏰ About to call handlePWALink...');
            await emailLinkHandler.handlePWALink(params);
            console.log('[EmailLinkRouter] ✅ handlePWALink completed - this should not show if redirect works');
            
            // PWA link processed - should redirect automatically
            setStatus('success');
            setMessage('Opening PWA or redirecting...');
            
            // If we're still here after 2 seconds, start emergency fallback
            setTimeout(() => {
              if (status === 'success') {
                console.log('[EmailLinkRouter] 🚨 EMERGENCY FALLBACK: Still here, forcing redirect');
                const fallbackUrl = `/student?pwa=true&from=email${studentEmail ? `&studentEmail=${studentEmail}` : ''}${source ? `&source=${source}` : ''}`;
                console.log('[EmailLinkRouter] 🎯 Emergency fallback URL:', fallbackUrl);
                window.location.href = fallbackUrl;
              }
            }, 2000);
            
            // Auto-close this window after 5 seconds as final cleanup
            setTimeout(() => {
              startAutoClose(3, 'PWA link processed - cleaning up');
            }, 5000);
            break;

          case 'browser':
            console.log('[EmailLinkRouter] 🌐 Processing Browser link...');
            await emailLinkHandler.handleBrowserLink(params);
            setStatus('success');
            setMessage('Opening in browser...');
            
            // Auto-close after opening browser link (2 seconds)
            setTimeout(() => {
              startAutoClose(2, 'Browser link opened successfully');
            }, 1000);
            break;

          case 'install':
            console.log('[EmailLinkRouter] ⬇️ Processing Install link...');
            await emailLinkHandler.handleInstallLink(params);
            setStatus('success');
            setMessage('Opening installation guide...');
            
            // Auto-close after opening install guide (3 seconds)
            setTimeout(() => {
              startAutoClose(3, 'Installation guide opened successfully');
            }, 1000);
            break;

          default:
            throw new Error(`Unknown type: ${type}`);
        }

      } catch (error) {
        console.error('[EmailLinkRouter] Error handling email link:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        
        // Auto-close errors after 10 seconds to prevent stuck windows
        setTimeout(() => {
          startAutoClose(10, 'Error occurred - auto-closing for cleanup');
        }, 2000);
      }
    };

    handleEmailLink();
  }, [searchParams]);

  const handleRetry = () => {
    setStatus('processing');
    setMessage('Retrying...');
    window.location.reload();
  };

  const handleGoToDashboard = () => {
    const studentEmail = searchParams.get('studentEmail');
    const dashboardUrl = studentEmail 
      ? `/student?studentEmail=${studentEmail}&source=email_fallback`
      : '/student?source=email_fallback';
    
    window.location.href = dashboardUrl;
  };

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        maxW="md"
        w="full"
        textAlign="center"
      >
        <VStack spacing={6}>
          {/* Header */}
          <VStack spacing={2}>
            <Text fontSize="2xl" fontWeight="bold" color="blue.600">
              📧 Processing Email Link
            </Text>
            <Text color="gray.600">
              Lumino Learning Assignment Access
            </Text>
          </VStack>

          {/* Status Display */}
          {status === 'processing' && (
            <VStack spacing={4}>
              <Spinner size="lg" color="blue.500" />
              <Text color="gray.700">{message}</Text>
              <Text fontSize="sm" color="gray.500">
                This may take a few seconds...
              </Text>
            </VStack>
          )}

          {status === 'success' && (
            <VStack spacing={4}>
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Success!</Text>
                  <Text>{message}</Text>
                </Box>
              </Alert>
              
              {countdown !== null && (
                <Box
                  bg="blue.50"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="blue.200"
                >
                  <VStack spacing={2}>
                    <Text fontSize="sm" color="blue.700" textAlign="center">
                      <strong>⏰ Auto-closing in {countdown} second{countdown !== 1 ? 's' : ''}</strong>
                      <br />
                      <Text fontSize="xs" color="blue.600" mt={1}>
                        {autoCloseReason}
                      </Text>
                    </Text>
                    <Button 
                      size="xs" 
                      variant="outline" 
                      colorScheme="blue"
                      onClick={cancelAutoClose}
                    >
                      🛑 Keep Window Open
                    </Button>
                  </VStack>
                </Box>
              )}
            </VStack>
          )}

          {status === 'error' && (
            <VStack spacing={4}>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box textAlign="left">
                  <Text fontWeight="bold">Something went wrong</Text>
                  <Text>{message}</Text>
                </Box>
              </Alert>

              {countdown !== null && (
                <Box
                  bg="orange.50"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="orange.200"
                >
                  <VStack spacing={2}>
                    <Text fontSize="sm" color="orange.700" textAlign="center">
                      <strong>⏰ Auto-closing in {countdown} second{countdown !== 1 ? 's' : ''}</strong>
                      <br />
                      <Text fontSize="xs" color="orange.600" mt={1}>
                        {autoCloseReason}
                      </Text>
                    </Text>
                    <Button 
                      size="xs" 
                      variant="outline" 
                      colorScheme="orange"
                      onClick={cancelAutoClose}
                    >
                      🛑 Keep Window Open
                    </Button>
                  </VStack>
                </Box>
              )}

              <VStack spacing={3}>
                <Button colorScheme="blue" onClick={handleRetry}>
                  🔄 Try Again
                </Button>
                <Button variant="outline" onClick={handleGoToDashboard}>
                  📚 Go to Student Dashboard
                </Button>
              </VStack>
            </VStack>
          )}

          {/* Debug Info (development only) */}
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <Box
              bg="gray.100"
              p={3}
              borderRadius="md"
              w="full"
              fontSize="sm"
              textAlign="left"
            >
              <Text fontWeight="bold" mb={2}>Debug Info:</Text>
              {debugInfo.map((info, index) => (
                <Text key={index} fontFamily="mono" color="gray.700">
                  {info}
                </Text>
              ))}
            </Box>
          )}

          {/* Help Text */}
          <Box
            bg="blue.50"
            p={4}
            borderRadius="md"
            w="full"
          >
            <Text fontSize="sm" color="blue.700">
              <strong>💡 Having trouble?</strong>
              <br />
              This page handles email links for assignments. If you're seeing this for more than a few seconds, 
              try using the "Go to Student Dashboard" button above.
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default EmailLinkRouter; 