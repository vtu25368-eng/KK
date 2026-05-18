import React, { useState, useRef, useEffect } from 'react';

const BOT_NAME = 'EventBot';
const BOT_AVATAR = '🤖';

const QUICK_REPLIES = [
  '📅 Show all events',
  '💰 Event prices',
  '📍 Venue info',
  '🎫 How to book?',
  '❓ Help',
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function generateBotResponse(message, events) {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|hola|greetings|sup|yo)\b/.test(lower)) {
    return `${getGreeting()}! 👋 Welcome to EventHub! I'm ${BOT_NAME}, your event assistant.\n\nI can help you with:\n• 📅 Browse available events\n• 💰 Check ticket prices\n• 📍 Find venue locations\n• 🎫 Booking guidance\n\nWhat would you like to know?`;
  }

  // Thank you
  if (/\b(thank|thanks|thx|ty)\b/.test(lower)) {
    return "You're welcome! 😊 Feel free to ask me anything else about our events. Happy to help!";
  }

  // Goodbye
  if (/\b(bye|goodbye|see ya|cya|later)\b/.test(lower)) {
    return "Goodbye! 👋 Have a wonderful day! Come back anytime you need help with events. 🎉";
  }

  // Show all events
  if (/\b(show|list|all|available|upcoming|what).*(event|happening|going on)\b/.test(lower) || lower === '📅 show all events') {
    if (!events || events.length === 0) {
      return "😔 There are no events available at the moment. Check back soon — new events are added regularly!";
    }
    let response = `📅 **Here are the available events:**\n\n`;
    events.forEach((ev, i) => {
      const status = ev.availableTickets > 0 ? `🟢 ${ev.availableTickets} tickets left` : '🔴 Sold Out';
      response += `${i + 1}. **${ev.name}**\n   📍 ${ev.venue} | 💰 ₹${ev.ticketPrice} | ${status}\n\n`;
    });
    response += `To book, click the "🎫 Book Now" button on any event card!`;
    return response;
  }

  // Prices
  if (/\b(price|cost|fee|ticket|how much|₹|rupee|charge|rate)\b/.test(lower) || lower === '💰 event prices') {
    if (!events || events.length === 0) {
      return "No events are currently listed. Prices will be shown once events are added!";
    }
    let response = `💰 **Ticket Prices:**\n\n`;
    events.forEach(ev => {
      response += `• **${ev.name}** — ₹${ev.ticketPrice}\n`;
    });
    response += `\n💡 **Pro tip:** Use promo codes like FEST50, TECH20, or FIRST10 to get discounts!`;
    return response;
  }

  // Venues
  if (/\b(venue|location|where|place|address|map|direction|hall|auditorium|ground)\b/.test(lower) || lower === '📍 venue info') {
    if (!events || events.length === 0) {
      return "No events are currently listed. Venue info will be available once events are added!";
    }
    let response = `📍 **Event Venues:**\n\n`;
    events.forEach(ev => {
      response += `• **${ev.name}** → ${ev.venue}\n`;
    });
    response += `\n🗺️ Click the "📍 View Map" button on any event card to see the exact location on the map!`;
    return response;
  }

  // How to book
  if (/\b(book|register|sign up|enroll|how to|steps|process|buy)\b/.test(lower) || lower === '🎫 how to book?') {
    return `🎫 **How to Book Tickets:**\n\n1️⃣ **Login/Sign Up** — Click the "Sign In" button in the navigation bar\n2️⃣ **Browse Events** — Explore events on the home page\n3️⃣ **Click "Book Now"** — On the event you want to attend\n4️⃣ **Fill Details** — Enter your name, email, department & number of tickets\n5️⃣ **Apply Promo Code** — (Optional) Use codes like FEST50 for discounts\n6️⃣ **Select Seats** — Choose your preferred seats\n7️⃣ **Make Payment** — Complete the payment to confirm\n8️⃣ **Get QR Ticket** — Your e-ticket with QR code is generated!\n\n📱 View your bookings anytime in "My Bookings" section.`;
  }

  // Date/time
  if (/\b(date|when|time|schedule|timing|day|tomorrow|today)\b/.test(lower)) {
    if (!events || events.length === 0) {
      return "No events are currently scheduled. Stay tuned for upcoming events!";
    }
    let response = `📅 **Event Schedule:**\n\n`;
    events.forEach(ev => {
      const dateStr = new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      response += `• **${ev.name}** — ${dateStr} at ${ev.time}\n`;
    });
    return response;
  }

  // Specific event search
  const matchedEvent = events?.find(ev =>
    lower.includes(ev.name.toLowerCase()) ||
    ev.name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word.toLowerCase()))
  );
  if (matchedEvent) {
    const dateStr = new Date(matchedEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const status = matchedEvent.availableTickets > 0 ? `🟢 ${matchedEvent.availableTickets} tickets available` : '🔴 Sold Out';
    return `🎪 **${matchedEvent.name}**\n\n📍 Venue: ${matchedEvent.venue}\n📅 Date: ${dateStr} at ${matchedEvent.time}\n🏛️ Department: ${matchedEvent.department}\n💰 Price: ₹${matchedEvent.ticketPrice}\n${status}\n${matchedEvent.description ? `\n📝 ${matchedEvent.description}` : ''}\n\n${matchedEvent.availableTickets > 0 ? 'Click "🎫 Book Now" on the event card to book!' : 'Unfortunately this event is sold out. 😔'}`;
  }

  // Category
  if (/\b(technical|cultural|workshop|seminar|competition|category|type)\b/.test(lower)) {
    const categories = [...new Set(events?.map(ev => ev.category || 'Technical'))];
    let response = `🏷️ **Event Categories:**\n\n`;
    categories.forEach(cat => {
      const catEvents = events.filter(ev => (ev.category || 'Technical') === cat);
      response += `• **${cat}** — ${catEvents.length} event(s)\n`;
    });
    response += `\nUse the category filter buttons at the top of the page to filter events!`;
    return response;
  }

  // Coupon/discount
  if (/\b(coupon|promo|discount|offer|code|deal)\b/.test(lower)) {
    return `🏷️ **Available Promo Codes:**\n\n• **FEST50** — 50% Off 🔥\n• **TECH20** — 20% Off\n• **FIRST10** — 10% Off\n• **EVENT25** — 25% Off\n\nApply these during checkout in the booking form to save on your tickets! 🎉`;
  }

  // Help
  if (/\b(help|support|assist|what can you|feature|option)\b/.test(lower) || lower === '❓ help') {
    return `❓ **I can help you with:**\n\n📅 **Events** — "Show all events", "What events are happening?"\n💰 **Prices** — "What are the ticket prices?"\n📍 **Venues** — "Where are the events?"\n🎫 **Booking** — "How to book tickets?"\n📆 **Schedule** — "When are the events?"\n🏷️ **Discounts** — "Any promo codes?"\n🔍 **Search** — Just type an event name!\n\nTry asking me anything about EventHub! 😊`;
  }

  // Seats
  if (/\b(seat|seating|sit|chair|capacity)\b/.test(lower)) {
    return `🪑 **Seat Selection:**\n\nWhen booking tickets, you'll get to choose your preferred seats from an interactive seat map!\n\n• 🟢 Green seats = Available\n• 🔵 Blue seats = Your selection\n• 🔴 Red seats = Already booked\n\nYou can select up to 5 seats per booking. Choose wisely — first come, first served! 😄`;
  }

  // Payment
  if (/\b(pay|payment|upi|card|wallet|money|gpay|phonepe)\b/.test(lower)) {
    return `💳 **Payment Methods:**\n\nWe support multiple payment options:\n\n• 💳 Credit/Debit Card\n• 📱 UPI (GPay, PhonePe, etc.)\n• 🏦 Net Banking\n• 👛 Digital Wallet\n\nAll payments are processed securely. You'll receive a confirmation with a QR ticket after successful payment! ✅`;
  }

  // Contact / about
  if (/\b(contact|about|who|team|developer|made)\b/.test(lower)) {
    return `ℹ️ **About EventHub:**\n\nEventHub is a modern Department Event Ticket Booking System designed for college campuses.\n\n✨ Features:\n• Browse & book event tickets\n• Interactive seat selection\n• Secure payments\n• QR-based e-tickets\n• Admin dashboard for event management\n\n© 2026 EventHub — All rights reserved.`;
  }

  // Fallback
  return `🤔 I'm not sure I understand that. Here are some things you can ask me:\n\n• "Show all events"\n• "What are the ticket prices?"\n• "Where are the venues?"\n• "How to book tickets?"\n• "Any promo codes?"\n\nOr type the name of a specific event to learn more about it!`;
}

function ChatBot({ events }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `${getGreeting()}! 👋 I'm ${BOT_NAME}, your EventHub assistant.\n\nI can help you find events, check prices, locate venues, and guide you through booking. What would you like to know?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    const delay = Math.min(800 + text.length * 15, 2000);
    setTimeout(() => {
      const botResponse = generateBotResponse(text, events);
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, delay);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickReply = (reply) => {
    sendMessage(reply);
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'bot',
      text: `Chat cleared! 🧹\n\n${getGreeting()}! How can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  // Format message text (basic markdown-like)
  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: formatted + (i < text.split('\n').length - 1 ? '<br/>' : '') }} />;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`chatbot-fab ${isOpen ? 'chatbot-fab--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        id="chatbot-toggle"
        title={isOpen ? 'Close chat' : 'Chat with EventBot'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadCount > 0 && <span className="chatbot-fab__badge">{unreadCount}</span>}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window" id="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header__info">
              <div className="chatbot-header__avatar">{BOT_AVATAR}</div>
              <div>
                <div className="chatbot-header__name">{BOT_NAME}</div>
                <div className="chatbot-header__status">
                  <span className="chatbot-header__status-dot"></span>
                  Online — Ready to help
                </div>
              </div>
            </div>
            <div className="chatbot-header__actions">
              <button className="chatbot-header__btn" onClick={clearChat} title="Clear chat">
                🗑️
              </button>
              <button className="chatbot-header__btn" onClick={() => setIsOpen(false)} title="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" id="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-msg chatbot-msg--${msg.type}`}>
                {msg.type === 'bot' && (
                  <div className="chatbot-msg__avatar">{BOT_AVATAR}</div>
                )}
                <div className="chatbot-msg__content">
                  <div className={`chatbot-msg__bubble chatbot-msg__bubble--${msg.type}`}>
                    {formatText(msg.text)}
                  </div>
                  <div className="chatbot-msg__time">{msg.time}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-msg chatbot-msg--bot">
                <div className="chatbot-msg__avatar">{BOT_AVATAR}</div>
                <div className="chatbot-msg__content">
                  <div className="chatbot-typing">
                    <span className="chatbot-typing__dot"></span>
                    <span className="chatbot-typing__dot"></span>
                    <span className="chatbot-typing__dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="chatbot-quick-replies">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                className="chatbot-quick-reply"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input */}
          <form className="chatbot-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              placeholder="Ask me about events..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              id="chatbot-input"
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!inputValue.trim()}
              title="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatBot;
