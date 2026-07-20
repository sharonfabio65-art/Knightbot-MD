async function sendCommand(sock, chatId, message, args) {
    try {
        // Check if there's text to send
        if (!args || args.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please provide text to send.\nExample: .send Hello bro how are you doing'
            }, { quoted: message });
            return;
        }

        // Join all arguments to form the message text
        const textToSend = args.join(' ');
        
        // Define number of messages to send
        const numberOfMessages = 2;
        
        // Send first message immediately
        await sock.sendMessage(chatId, { text: textToSend }, { quoted: message });
        console.log(`Sent message 1 of ${numberOfMessages}`);
        
        // Send remaining messages with delay
        for (let i = 2; i <= numberOfMessages; i++) {
            // Wait 2 seconds before sending next message
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await sock.sendMessage(chatId, { text: textToSend }, { quoted: message });
            console.log(`Sent message ${i} of ${numberOfMessages}`);
        }
        
        // Optional: Send completion notification
        await sock.sendMessage(chatId, { 
            text: `✅ Successfully sent ${numberOfMessages} messages with 2 second delay between each.`
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error in send command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to send messages. Please try again later.'
        }, { quoted: message });
    }
}

module.exports = sendCommand;