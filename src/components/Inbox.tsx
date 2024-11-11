import { useState, useEffect } from 'react';
import { User, listDocs, setDoc } from '@junobuild/core';
import InboxMessage from '../types/Inbox';
interface InboxProps {
    user: User;
  }
export const Inbox = ({ user }: InboxProps) => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [filter, setFilter] = useState('all');

  const fetchMessages = async () => {
    const { items } = await listDocs<InboxMessage>({
      collection: "inbox",
      filter: {
        owner: user.key
      }
    });

    setMessages(items.map(doc => ({
      id: doc.key,
      ...doc.data
    })));
  };

  const markAsRead = async (messageId: string) => {
    await setDoc({
      collection: "inbox",
      doc: {
        key: messageId,
        data: {
          ...messages.find(m => m.id === messageId),
          status: 'read'
        }
      }
    });
    fetchMessages();
  };

  return (
    <div className="inbox-container">
      <div className="inbox-header">
        <h2>Inbox</h2>
        <div className="inbox-filters">
          <select onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Messages</option>
            <option value="unread">Unread</option>
            <option value="feedback">Feedback</option>
            <option value="alerts">Alerts</option>
          </select>
        </div>
      </div>
      
      <div className="messages-list">
        {messages
          .filter(msg => filter === 'all' || msg.type === filter)
          .map(message => (
            <div 
              key={message.id} 
              className={`message-item ${message.status}`}
              onClick={() => markAsRead(message.id)}
            >
              <div className="message-priority">
                {message.priority === 'high' && 
                  <span className="material-icons">priority_high</span>
                }
              </div>
              <div className="message-content">
                <h3>{message.title}</h3>
                <p>{message.content}</p>
              </div>
              <div className="message-meta">
                <span>{new Date(message.metadata.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
