require('dotenv').config();
const ethers = require('ethers');
const fs = require('fs');

// --- Configuration ---
const rpcUrl = process.env.RPC_URL;
const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const abiPath = './ProfitFlipABI.json'; // Adjust if ABI file is named differently or elsewhere
// Default check interval used only as a fallback or when paused
const defaultCheckIntervalSeconds = parseInt(process.env.CHECK_INTERVAL_SECONDS || '60', 10);
const fixedGasPriceGwei = process.env.GAS_PRICE_GWEI; // Optional fixed gas price
const defaultGasLimit = parseInt(process.env.GAS_LIMIT || '500000', 10); // Optional default gas limit
const recoveryGasLimit = parseInt(process.env.RECOVERY_GAS_LIMIT || '300000', 10); // Specific gas limit for recovery functions
const MinSleepSeconds = 5; // Minimum sleep time in seconds to prevent tight loops
const SleepBufferSeconds = 2; // Wake up slightly *after* the target time
const PRE_CHECK_BUFFER_SECONDS = 10; // Start checking this many seconds before target time
const TRANSACTION_OVERHEAD_SECONDS = 8; // Expected overhead for tx preparation and confirmation

// --- State Tracking ---
const operatorState = {
    totalGasSpent: 0n,          // Cumulative gas spent in wei
    currentEpoch: 0n,           // Current epoch number
    nextCheckTime: null,        // Timestamp of next scheduled check
    lastGasPrice: 0n,          // Last gas price used
    transactionCount: 0,        // Total number of transactions
    startTime: Date.now()       // Operator start time
};

// Function to format gas metrics
function formatGasMetrics() {
    const gasInEth = ethers.formatEther(operatorState.totalGasSpent);
    return `Total Gas: ${gasInEth} POL (${operatorState.transactionCount} txs)`;
}

// Function to format time until next check
function formatTimeToNext() {
    if (!operatorState.nextCheckTime) return 'Not scheduled';
    const now = Date.now();
    const timeLeft = operatorState.nextCheckTime - now;
    if (timeLeft <= 0) return 'Imminent';
    return `${(timeLeft / 1000).toFixed(1)}s`;
}

// Function to log operator status
function logOperatorStatus() {
    console.log('\n=== Operator Status ===');
    console.log(`Current Epoch: ${operatorState.currentEpoch}`);
    console.log(`${formatGasMetrics()}`);
    console.log(`Next Check: ${formatTimeToNext()}`);
    console.log('====================\n');
}

// --- Validate configuration ---
if (!rpcUrl || !operatorPrivateKey || !contractAddress) {
    console.error('Error: Missing required environment variables (RPC_URL, OPERATOR_PRIVATE_KEY, CONTRACT_ADDRESS).');
    process.exit(1);
}
if (isNaN(defaultCheckIntervalSeconds) || defaultCheckIntervalSeconds <= 0) {
    console.error('Error: Invalid CHECK_INTERVAL_SECONDS. Must be a positive number.');
    process.exit(1);
}
// Add more validation as needed (e.g., private key format)

// --- Setup Ethers ---
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(operatorPrivateKey, provider);
let contractABI;
try {
    contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (error) {
    console.error(`Error reading ABI file at ${abiPath}:`, error);
    process.exit(1);
}
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// --- Initial Console Logs ---
console.log(`Operator script started for ProfitFlip at ${contractAddress}`);
console.log(`Operator address: ${wallet.address}`);
console.log(`Using RPC: ${rpcUrl}`);
console.log(`Default check interval: ${defaultCheckIntervalSeconds} seconds`);
if (fixedGasPriceGwei) {
    console.log(`Using fixed gas price: ${fixedGasPriceGwei} Gwei`);
}
if (defaultGasLimit) {
    console.log(`Using default gas limit: ${defaultGasLimit}`);
}


// --- Helper Functions ---

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends a transaction to the contract with error handling and optional retries.
 * @param {string} methodName - The name of the contract method to call.
 * @param {Array} args - Arguments to pass to the contract method.
 * @param {object} options - Options object.
 * @param {number} [options.retryCount=3] - Number of retries on network/gas errors.
 * @param {number} [options.gasLimit=defaultGasLimit] - Gas limit for the transaction.
 * @param {number} [options.baseDelay=1000] - Base delay in ms for exponential backoff.
 * @returns {Promise<boolean>} - True if the transaction was successfully confirmed, false otherwise.
 */
async function sendTransaction(methodName, args = [], options = { retryCount: 3, gasLimit: defaultGasLimit, baseDelay: 1000 }) {
    // Ensure options and defaults are handled correctly
    const mergedOptions = { retryCount: 3, gasLimit: defaultGasLimit, baseDelay: 1000, ...options };
    const { retryCount, gasLimit, baseDelay } = mergedOptions;

    console.log(`Attempting to call ${methodName}(${args.join(', ')})...`);
    try {
        const overrides = {
            gasLimit: gasLimit // Use provided or default gas limit
        };

        // Handle gas price (fixed or dynamic EIP-1559/legacy)
        if (fixedGasPriceGwei) {
            overrides.gasPrice = ethers.parseUnits(fixedGasPriceGwei, 'gwei');
            operatorState.lastGasPrice = overrides.gasPrice;
            console.log(`Using fixed gas price: ${fixedGasPriceGwei} Gwei`);
        } else {
            try {
                const feeData = await provider.getFeeData();
                if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                    overrides.maxFeePerGas = feeData.maxFeePerGas;
                    overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                    operatorState.lastGasPrice = feeData.maxFeePerGas;
                    console.log(`Using EIP-1559 gas: maxFee=${ethers.formatUnits(overrides.maxFeePerGas, 'gwei')} Gwei, priorityFee=${ethers.formatUnits(overrides.maxPriorityFeePerGas, 'gwei')} Gwei`);
                } else if (feeData.gasPrice) {
                    overrides.gasPrice = feeData.gasPrice;
                    operatorState.lastGasPrice = feeData.gasPrice;
                    console.log(`Using legacy gas price: ${ethers.formatUnits(overrides.gasPrice, 'gwei')} Gwei`);
                }
            } catch (gasError) {
                console.warn(`Error fetching gas price data: ${gasError.message}. Falling back.`);
            }
        }

        const tx = await contract[methodName](...args, overrides);
        console.log(`Transaction sent for ${methodName}: ${tx.hash}`);
        console.log(`Waiting for confirmation...`);
        
        const receipt = await tx.wait(1);
        if (receipt.status === 0) {
             console.error(`Transaction ${tx.hash} confirmed but FAILED (reverted). Block: ${receipt.blockNumber}`);
             return false;
        }

        // Update gas tracking
        const gasUsed = receipt.gasUsed;
        const effectiveGasPrice = receipt.effectiveGasPrice || operatorState.lastGasPrice;
        const gasCost = gasUsed * effectiveGasPrice;
        operatorState.totalGasSpent += gasCost;
        operatorState.transactionCount++;

        console.log(`${methodName} transaction confirmed successfully! Block: ${receipt.blockNumber}, Gas Used: ${gasUsed.toString()}`);
        logOperatorStatus(); // Log updated status after transaction
        return true;

    } catch (error) {
        const reason = error.reason || (error.info?.error?.message);
        const code = error.code;
        const errorMessage = reason || error.message || "Unknown error";
        
        // Categorize errors for better handling
        const isNetworkError = code === 'NETWORK_ERROR' || 
                             code === 'TIMEOUT' || 
                             errorMessage.includes('network') ||
                             errorMessage.includes('timeout');
                             
        const isGasError = code === 'UNPREDICTABLE_GAS_LIMIT' || 
                          code === 'REPLACEMENT_UNDERPRICED' ||
                          errorMessage.includes('gas') ||
                          errorMessage.includes('underpriced');
                          
        const isNonceError = code === 'NONCE_EXPIRED' || 
                           errorMessage.includes('nonce') ||
                           errorMessage.includes('already been used');
                           
        const isRpcError = errorMessage.includes('rate limit') ||
                          errorMessage.includes('too many requests') ||
                          errorMessage.includes('connection refused') ||
                          errorMessage.includes('connection reset');

        // Log error details
        console.error(`Error executing ${methodName}:`, {
            code: code || 'N/A',
            message: errorMessage,
            type: isNetworkError ? 'Network' : 
                  isGasError ? 'Gas' : 
                  isNonceError ? 'Nonce' :
                  isRpcError ? 'RPC' : 'Unknown'
        });

        // Check for non-retryable errors (contract logic errors)
        if (errorMessage.includes("execution reverted") || code === 'CALL_EXCEPTION') {
            console.error(`Transaction reverted: "${errorMessage}". Check contract conditions (timing, permissions, state). Not retrying.`);
            return false;
        }

        // Check for retryable errors with exponential backoff
        if (retryCount > 0 && (isNetworkError || isGasError || isNonceError || isRpcError)) {
            const backoffDelay = baseDelay * Math.pow(2, 3 - retryCount); // Exponential backoff
            console.warn(`Retryable error detected for ${methodName}. Retrying in ${backoffDelay/1000}s... (${retryCount} retries left)`);
            await sleep(backoffDelay);
            
            // For nonce errors, try to get a fresh nonce
            if (isNonceError) {
                try {
                    const freshNonce = await wallet.getNonce();
                    overrides.nonce = freshNonce;
                    console.log(`Retrying with fresh nonce: ${freshNonce}`);
                } catch (nonceError) {
                    console.warn(`Failed to get fresh nonce: ${nonceError.message}`);
                }
            }
            
            // Pass decreased retry count in options for recursive call
            return sendTransaction(methodName, args, { 
                ...mergedOptions, 
                retryCount: retryCount - 1,
                baseDelay: baseDelay * 1.5 // Increase base delay for next retry
            });
        }

        console.error(`Failed to execute ${methodName} after retries or due to non-retryable error.`);
        return false;
    }
}

/**
 * Attempts the full recovery sequence: Pause -> Unpause -> Genesis Start -> Genesis Lock (if needed by contract).
 * Assumes operator has permissions for all steps. Aims to clear state issues and allow continuation from the current/stuck epoch.
 * @returns {Promise<boolean>} - True if the sequence attempt completed (though steps might have failed), false if a critical error stopped it early.
 */
async function attemptFullRecoverySequence() {
    console.warn("!!! Initiating automated recovery sequence !!!");

    let recoveryStep = 1; // Track progress
    let overallSuccess = true; // Track if all steps succeeded

    try {
        // Step 1: Pause (if not already paused)
        console.log(`Recovery Step ${recoveryStep++}: Checking pause status and attempting to pause if needed...`);
        let isPaused = await contract.paused();
        if (!isPaused) {
            let successPause = await sendTransaction('pause', [], { gasLimit: recoveryGasLimit });
            if (!successPause) {
                overallSuccess = false;
                console.error("Recovery Step 1 FAILED: Could not pause contract.");
                throw new Error("Failed to pause contract during recovery.");
            }
            console.log("Contract successfully paused. Waiting a few seconds...");
            await sleep(5000); // Wait after pausing
        } else {
            console.log("Contract was already paused.");
        }


        // Step 2: Unpause (Assuming operator has permission)
        console.log(`Recovery Step ${recoveryStep++}: Attempting to unpause...`);
        let successUnpause = await sendTransaction('unpause', [], { gasLimit: recoveryGasLimit });
        if (!successUnpause) {
            overallSuccess = false;
            // If unpause fails, admin intervention is likely needed anyway
            throw new Error("Failed to unpause contract during recovery. ADMIN intervention likely required.");
        }
        console.log("Contract successfully unpaused. Waiting a few seconds...");
        await sleep(5000); // Wait after unpausing

        // Step 3: Genesis Start (If required by contract logic after unpause)
        // This might just set flags without changing epoch if contract intends continuation.
        console.log(`Recovery Step ${recoveryStep++}: Attempting genesisStartRound (may be required by contract after unpause)...`);
        let successStart = await sendTransaction('genesisStartRound', [], { gasLimit: defaultGasLimit });
        if (!successStart) {
            // Log as warning, as contract might proceed even if this reverts (e.g., if start flag already set)
            console.warn("Recovery Step 3 WARNING: genesisStartRound transaction failed/reverted. Contract state might already be past this or require different action.");
            // Don't necessarily set overallSuccess to false, depends on contract logic.
        } else {
            console.log("genesisStartRound transaction successful during recovery. Waiting a few seconds...");
            await sleep(5000); // Wait after starting attempt
        }

        // Step 4: Genesis Lock (If required by contract logic after genesisStart during recovery)
        // Check if genesisLock is *still* false after the above steps.
        const needsLockCheck = !(await contract.genesisLockOnce());
        if (needsLockCheck) {
            console.log(`Recovery Step ${recoveryStep++}: genesisLockOnce is still false. Checking conditions and attempting genesisLockRound (if needed by contract)...`);
            // *** IMPORTANT: The contract logic dictates if Round 1 lock is needed here, or if it should lock based on current epoch ***
            // The original script hardcoded Round 1 check here. Based on "continuation" logic,
            // this lock might not be applicable or might need different parameters if epoch > 1.
            // For now, we mimic the original script's attempt for Round 1 lock,
            // assuming the contract requires this specific action post-unpause regardless of epoch.
            const targetLockEpoch = 1n;
            const round1 = await contract.rounds(targetLockEpoch);
            const lockTimestamp = round1.lockTimestamp;
            const buffer = await contract.bufferSeconds();
            let now = BigInt(Math.floor(Date.now() / 1000));

            if (lockTimestamp === 0n) {
                 console.warn(`Recovery: Round 1 lockTimestamp is 0 after recovery steps. Cannot attempt genesisLockRound. Main loop must handle.`);
                 overallSuccess = false; // Indicate lock couldn't be attempted here
            } else if (now >= lockTimestamp && now <= lockTimestamp + buffer) {
                 console.log(`Recovery: Conditions met for genesisLockRound (Round 1). Attempting...`);
                 let successLock = await sendTransaction('genesisLockRound', [], { gasLimit: defaultGasLimit });
                 if (!successLock) {
                     console.warn("Recovery: Failed genesisLockRound attempt during recovery sequence.");
                     overallSuccess = false;
                 } else {
                     console.log("Recovery: genesisLockRound successful during recovery sequence.");
                 }
             } else {
                 console.log(`Recovery: Conditions for genesisLockRound (Round 1) not met (now: ${now}, lock: ${lockTimestamp}, bufferEnd: ${lockTimestamp+buffer}). Main loop will handle.`);
                 overallSuccess = false; // Indicate lock couldn't be completed here
             }
        } else {
             console.log(`Recovery Step ${recoveryStep++}: Skipping genesisLockRound check as genesisLockOnce is already true.`);
        }


        console.log(`Automated recovery sequence attempted. Overall success indication (steps completed without critical error): ${overallSuccess}`);
        return true; // Indicate recovery was attempted

    } catch (error) {
        console.error("**********************************************************************");
        console.error(`CRITICAL: Error during automated recovery sequence at Step ${recoveryStep-1}:`, error.message);
        console.error("ACTION REQUIRED: Manual intervention likely needed. Check contract state and operator logs.");
        console.error("The contract might be in an inconsistent state (e.g., paused).");
        console.error("**********************************************************************");
        // Consider adding external alerting here
        return false; // Indicate recovery attempt was stopped by critical error
    }
}


// --- Main Operator Logic ---
let isProcessing = false; // Prevent overlapping runs
let mainLoopTimeoutId = null; // Store timeout ID

async function checkAndExecuteTask() {
    if (isProcessing) {
        console.log("Previous task still running. Skipping check.");
        return;
    }
    isProcessing = true;
    console.log(`\n[${new Date().toISOString()}] Running operator check...`);

    let nextCheckDelayMs = defaultCheckIntervalSeconds * 1000; // Default delay
    let calculatedTimestamp = 0n; // Unix timestamp (seconds) for next action
    let scheduleAtEnd = true; // Flag to control if scheduling happens at the end (default yes)

    try {
        // Update current epoch at the start of each check
        operatorState.currentEpoch = await contract.currentEpoch();
        
        // 1. Check if Paused & Attempt Unpause if Operator Can
        const isPaused = await contract.paused();
        if (isPaused) {
            console.log("Contract is currently PAUSED. Attempting to unpause...");
            // Note: Unpausing might trigger contract logic that requires genesisStart/Lock checks again.
            const success = await sendTransaction('unpause', [], { gasLimit: recoveryGasLimit });
            if (success) {
                console.log("Successfully submitted unpause transaction. Will check state again soon.");
                nextCheckDelayMs = MinSleepSeconds * 1000 * 2; // Check sooner after unpause attempt
            } else {
                console.error("Failed to send unpause transaction. Will retry check after default interval.");
                nextCheckDelayMs = defaultCheckIntervalSeconds * 1000; // Longer delay if unpause failed
            }
            scheduleNextCheck(nextCheckDelayMs);
            scheduleAtEnd = false; // Prevent duplicate scheduling in finally block
            return; // Exit function now
        }

        // 2. Check Genesis State Flags (Start and Lock)
        const genesisStarted = await contract.genesisStartOnce();
        const genesisLocked = await contract.genesisLockOnce();

        // Handle state where genesis hasn't started at all
        if (!genesisStarted) {
            console.log("Genesis not started. Attempting genesisStartRound()...");
            await sendTransaction('genesisStartRound');
            // Check again soon to see if it succeeded and needs locking
            nextCheckDelayMs = MinSleepSeconds * 1000 * 2;
            scheduleNextCheck(nextCheckDelayMs);
            scheduleAtEnd = false;
            return; // Exit function now
        }

        // Handle state where genesis started but isn't locked
        if (!genesisLocked) {
            console.log("Genesis started but not locked. Attempting genesisLockRound()...");
            // Genesis lock should be independent of round timing
            await sendTransaction('genesisLockRound');
            // Check again soon to see if it succeeded
            nextCheckDelayMs = MinSleepSeconds * 1000 * 2;
            scheduleNextCheck(nextCheckDelayMs);
            scheduleAtEnd = false;
            return; // Exit function early, handled !genesisLocked state
        }

        // --- If we reach here: Genesis Started and Genesis Locked are both TRUE ---

        // 3. Main Execution Logic (executeRound checks)
        console.log("Genesis complete. Checking conditions for executeRound()...");
        const currentEpoch = await contract.currentEpoch();
        const targetLockEpoch = currentEpoch; // Round to lock bets for
        const targetEndEpoch = currentEpoch - 1n; // Round to payout/close

         // Handle case where genesis just finished (Epoch 1 is current)
         // No round to end yet, just need to wait for Epoch 1 lock/close times.
         if (currentEpoch === 1n) {
            console.log("Waiting for first round (Epoch 1) to complete its interval before executeRound can run.");
            const round1 = await contract.rounds(1);
            const closeTimestamp = round1.closeTimestamp; // executeRound often depends on previous close time
            if (closeTimestamp > 0n) {
                // Schedule next check targeting the close time (or slightly after)
                calculatedTimestamp = closeTimestamp;
                scheduleNextCheck(0, calculatedTimestamp);
                console.log(`Next check scheduled to align with Epoch 1 close time: ${new Date(Number(closeTimestamp) * 1000).toISOString()}`);
            } else {
                console.warn("Epoch 1 closeTimestamp is 0. Scheduling default check interval. State might be inconsistent.");
                scheduleNextCheck(defaultCheckIntervalSeconds * 1000);
            }
            scheduleAtEnd = false;
            return; // Exit, wait for epoch 1 to finish
         }

         // Basic sanity check for epoch calculation if epoch > 1
         if (targetEndEpoch <= 0n || targetLockEpoch <= 0n){
             console.error(`Invalid target epochs calculated: Lock=${targetLockEpoch}, End=${targetEndEpoch}. CurrentEpoch=${currentEpoch}. Scheduling fallback check.`);
             scheduleNextCheck(defaultCheckIntervalSeconds * 1000);
             scheduleAtEnd = false;
             return; // Exit
         }

        // Fetch data for the relevant rounds for executeRound
        const roundToLock = await contract.rounds(targetLockEpoch);
        const roundToEnd = await contract.rounds(targetEndEpoch);
        const buffer = await contract.bufferSeconds();
        const now = BigInt(Math.floor(Date.now() / 1000));

        // Check if round data seems initialized
        if (roundToLock.startTimestamp === 0n || roundToEnd.startTimestamp === 0n) {
            console.warn(`Round data not yet initialized for epoch ${targetLockEpoch} (lock) or ${targetEndEpoch} (end). Current epoch: ${currentEpoch}. May be transient state. Scheduling retry.`);
             scheduleNextCheck(MinSleepSeconds * 1000 * 2); // Check again relatively soon
            scheduleAtEnd = false;
            return; // Exit
        }

        // Get timestamps needed for executeRound condition
        const lockTimestamp = roundToLock.lockTimestamp;    // Time current round bets get locked
        const closeTimestamp = roundToEnd.closeTimestamp;   // Time previous round closes for payout

        console.log(`Current Time : ${now}`);
        console.log(`Round ${targetLockEpoch} Lock Time : ${lockTimestamp} (Window End: ${lockTimestamp + buffer})`);
        console.log(`Round ${targetEndEpoch} Close Time: ${closeTimestamp} (Window End: ${closeTimestamp + buffer})`);

        // Determine the timestamp after which executeRound should be callable
        // Usually, it requires *both* the previous round to be closed AND the current round's bets to be locked.
        const executionTriggerTime = lockTimestamp > closeTimestamp ? lockTimestamp : closeTimestamp;

        if (now >= executionTriggerTime - BigInt(TRANSACTION_OVERHEAD_SECONDS)) {
             // Check if we are within the buffer period *after* the trigger time
             const withinBuffer = now <= (executionTriggerTime + buffer);

             if (withinBuffer) {
                 console.log(`Conditions met for executeRound (now: ${now}, target: ${executionTriggerTime}, buffer end: ${executionTriggerTime + buffer}).`);
                 console.log(`Starting transaction ${TRANSACTION_OVERHEAD_SECONDS}s before target time to account for overhead.`);
                 await sendTransaction('executeRound');
                 nextCheckDelayMs = MinSleepSeconds * 1000 * 3;
             } else {
                 // Missed the buffer window for executeRound
                 console.warn(`Missed the buffer window for executeRound (now: ${now}, triggerTime: ${executionTriggerTime}, bufferEnd: ${executionTriggerTime + buffer}).`);
                 await attemptFullRecoverySequence(); // Attempt recovery if executeRound window missed
                 nextCheckDelayMs = MinSleepSeconds * 1000 * 2; // Check sooner after recovery attempt
             }
             // Schedule based on interval after attempt/recovery
             scheduleNextCheck(nextCheckDelayMs);
        } else {
            // Not time yet for executeRound, schedule check for the trigger time
            calculatedTimestamp = executionTriggerTime;
            console.log(`Waiting for next executeRound conditions (later of lock ${targetLockEpoch} or close ${targetEndEpoch})...`);
            scheduleNextCheck(0, calculatedTimestamp);
        }
        scheduleAtEnd = false; // Scheduling handled within this block

    } catch (error) {
        console.error(`Critical Error in operator task:`, error);
        // Schedule retry after default interval on critical error only if specific logic didn't schedule
        if (scheduleAtEnd) {
            scheduleNextCheck(defaultCheckIntervalSeconds * 1000);
        }
    } finally {
        // Ensure scheduling happens if no other path scheduled it (should be rare if logic covers all paths)
        if (scheduleAtEnd) {
             console.warn("Reached end of task without explicit scheduling. Using default fallback.");
             scheduleNextCheck(defaultCheckIntervalSeconds * 1000);
        }
         console.log("Check cycle finished."); // Log end of cycle processing
        // isProcessing flag is reset within scheduleNextCheck *before* next call
    }
}

// --- Scheduling Function ---
function scheduleNextCheck(delayMs = defaultCheckIntervalSeconds * 1000, targetTimestamp = 0n) {
     // Clear any existing timeout *before* setting a new one or resetting the flag
     if(mainLoopTimeoutId) {
         clearTimeout(mainLoopTimeoutId);
         mainLoopTimeoutId = null;
     }

     let finalDelayMs = delayMs;

     if (targetTimestamp > 0n) {
         const nowMs = Date.now();
         // Subtract PRE_CHECK_BUFFER_SECONDS to start check earlier
         const targetMs = (Number(targetTimestamp) * 1000) - (PRE_CHECK_BUFFER_SECONDS * 1000);
         const calculatedDelay = targetMs - nowMs;

         finalDelayMs = calculatedDelay > (MinSleepSeconds * 1000)
             ? calculatedDelay
             : (MinSleepSeconds * 1000);

         const targetDate = new Date(Number(targetTimestamp) * 1000);
         const wakeUpDate = new Date(Date.now() + finalDelayMs);
         console.log(`Scheduling next check in ${(finalDelayMs / 1000).toFixed(1)}s (around ${wakeUpDate.toISOString()}) - Targeting action at ${targetDate.toISOString()}`);
         console.log(`Pre-check buffer: ${PRE_CHECK_BUFFER_SECONDS}s, Expected tx overhead: ${TRANSACTION_OVERHEAD_SECONDS}s`);
     } else {
          const wakeUpDate = new Date(Date.now() + finalDelayMs);
         console.log(`Scheduling next check in ${(finalDelayMs / 1000).toFixed(1)}s (around ${wakeUpDate.toISOString()}) - Using interval.`);
     }

     // Ensure minimum delay safety net
     if (finalDelayMs < MinSleepSeconds * 1000) {
        console.log(`Calculated delay ${finalDelayMs}ms is less than minimum ${MinSleepSeconds * 1000}ms. Adjusting.`);
        finalDelayMs = MinSleepSeconds * 1000;
     }

     // Update next check time in state
     operatorState.nextCheckTime = Date.now() + finalDelayMs;

     // Set the timeout for the next execution
     console.log(`Setting timeout for ${finalDelayMs}ms`);
     mainLoopTimeoutId = setTimeout(() => {
        isProcessing = false;
        mainLoopTimeoutId = null;
        checkAndExecuteTask();
     }, finalDelayMs);

     // Log current status after scheduling
     logOperatorStatus();
}

// --- Start the Operator ---
console.log("Starting operator loop with dynamic scheduling...");
// Ensure isProcessing is false before first run
isProcessing = false;
checkAndExecuteTask(); // Start the first check immediately

// --- Shutdown Handling ---
function gracefulShutdown() {
    console.log("Received shutdown signal. Clearing any scheduled tasks...");
    if (mainLoopTimeoutId) {
        clearTimeout(mainLoopTimeoutId);
        mainLoopTimeoutId = null; // Explicitly clear ID
    }
    console.log("Operator script exiting.");
    process.exit(0); // Exit code 0 for clean shutdown
}

process.on('SIGINT', gracefulShutdown); // Ctrl+C
process.on('SIGTERM', gracefulShutdown); // kill/systemd stop