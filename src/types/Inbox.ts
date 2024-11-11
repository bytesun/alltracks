export default interface InboxMessage {
  id: string;
  type: 'feedback' | 'notification' | 'alert' | 'system' | 'group';
  title: string;
  content: string;
  status: 'unread' | 'read' | 'archived';
  priority: 'low' | 'medium' | 'high';
  metadata: {
    sender?: string;
    groupId?: string;
    trailId?: string;
    eventId?: string;
    timestamp: number;
  }
}
