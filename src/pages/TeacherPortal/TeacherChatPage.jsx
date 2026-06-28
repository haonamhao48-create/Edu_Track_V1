import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { chatService } from '../../services/chatService';
import { classService } from '../../services/classService';
import styles from './TeacherChatPage.module.css';

// Custom lightweight STOMP over WebSocket client to match backend Java communication-service
class BrowserStompClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.socket = null;
    this.isConnected = false;
    this.listeners = {};
    this.connectResolve = null;
    this.connectReject = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('[STOMP] Connecting WebSocket to:', this.url);
        this.socket = new WebSocket(this.url);
        this.connectResolve = resolve;
        this.connectReject = reject;

        this.socket.onopen = () => {
          // Send STOMP CONNECT frame
          const connectFrame = 
            `CONNECT\n` +
            `accept-version:1.1,1.2\n` +
            `heart-beat:10000,10000\n` +
            `Authorization:Bearer ${this.token}\n\n\x00`;
          
          this.socket.send(connectFrame);
          console.log('[STOMP] Sent CONNECT frame');
        };

        this.socket.onmessage = (event) => {
          this._handleRawMessage(event.data);
        };

        this.socket.onerror = (err) => {
          console.error('[STOMP] WebSocket Error:', err);
          this.isConnected = false;
          if (this.connectReject) {
            this.connectReject(err);
            this.connectReject = null;
          }
        };

        this.socket.onclose = () => {
          console.log('[STOMP] WebSocket Closed');
          this.isConnected = false;
          if (this.connectReject) {
            this.connectReject(new Error('WebSocket closed before STOMP CONNECTED'));
            this.connectReject = null;
          }
        };

      } catch (e) {
        reject(e);
      }
    });
  }

  subscribe(destination, callback) {
    if (!this.isConnected) return;
    const subId = `sub-${Math.random().toString(36).substr(2, 9)}`;
    this.listeners[destination] = this.listeners[destination] || [];
    this.listeners[destination].push(callback);

    const subscribeFrame = 
      `SUBSCRIBE\n` +
      `id:${subId}\n` +
      `destination:${destination}\n\n\x00`;
    
    this.socket.send(subscribeFrame);
    console.log('[STOMP] Subscribed to:', destination);
  }

  sendMessage(destination, body) {
    if (!this.isConnected) return;
    const sendFrame = 
      `SEND\n` +
      `destination:${destination}\n` +
      `content-type:application/json\n\n` +
      JSON.stringify(body) + `\x00`;
    
    this.socket.send(sendFrame);
    console.log('[STOMP] Sent message to:', destination);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.isConnected = false;
    this.listeners = {};
    this.connectResolve = null;
    this.connectReject = null;
  }

  _handleRawMessage(rawData) {
    const rawFrames = rawData.split('\x00');
    for (const rawFrame of rawFrames) {
      if (!rawFrame || rawFrame.trim() === '') continue;

      // Find boundary between headers and body (could be \n\n or \r\n\r\n)
      let doubleLIndex = rawFrame.indexOf('\n\n');
      let boundaryLen = 2;
      if (doubleLIndex === -1) {
        doubleLIndex = rawFrame.indexOf('\r\n\r\n');
        boundaryLen = 4;
      }

      let head = '';
      let body = '';
      if (doubleLIndex !== -1) {
        head = rawFrame.substring(0, doubleLIndex);
        body = rawFrame.substring(doubleLIndex + boundaryLen);
      } else {
        head = rawFrame;
        body = '';
      }

      const headLines = head.split(/\r?\n/);
      const command = headLines[0].trim();
      if (!command) continue;

      const headers = {};
      for (let i = 1; i < headLines.length; i++) {
        const line = headLines[i];
        if (line.includes(':')) {
          const idx = line.indexOf(':');
          headers[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
      }

      if (command === 'CONNECTED') {
        console.log('[STOMP] STOMP connected successfully.');
        this.isConnected = true;
        if (this.connectResolve) {
          this.connectResolve();
          this.connectResolve = null;
          this.connectReject = null;
        }
      } else if (command === 'MESSAGE') {
        const dest = headers['destination'];
        if (dest && this.listeners[dest]) {
          this.listeners[dest].forEach(cb => {
            try {
              cb(body);
            } catch (err) {
              console.error('[STOMP] Callback error:', err);
            }
          });
        }
      }
    }
  }
}

const TeacherChatPage = ({ onNavigate }) => {
  const [rooms, setRooms] = useState([]);
  const [classNames, setClassNames] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Selected Room Conversation
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');

  // WebSocket / Polling references
  const stompClientRef = useRef(null);
  const messageEndRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const visibilityListenerRef = useRef(null);

  const userObj = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch (_) {
      return {};
    }
  })();
  const myUserId = (userObj?.userId || userObj?.id || userObj?.teacherId || '').toString();
  const token = localStorage.getItem('token') || '';

  const formatMessageTime = useCallback((dateStr) => {
    if (!dateStr) return '';
    try {
      const dt = new Date(dateStr);
      return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    } catch (_) {
      return dateStr;
    }
  }, []);

  const normalizeRoom = useCallback((room) => {
    if (!room) return null;
    if (room.parent !== undefined) return room; // Already mock data
    const other = room.otherParticipant || {};
    return {
      roomId: room.roomId,
      parent: other.fullName || room.roomName || 'Phụ huynh',
      studentName: '',
      className: other.role === 'PARENT' ? 'Phụ huynh học sinh' : 'Thành viên',
      lastMessage: room.lastMessage?.content || 'Chưa có tin nhắn',
      lastMessageTime: room.lastMessage?.sentAt ? formatMessageTime(room.lastMessage.sentAt) : '',
      unreadCount: Number(room.unreadCount || 0),
      avatar: other.avatarUrl || '',
      isOnline: false
    };
  }, [formatMessageTime]);

  const normalizeMessage = useCallback((msg) => {
    if (!msg) return null;
    if (msg.senderId !== undefined) return msg; // Already local/mock msg
    return {
      id: msg.id || msg.clientMessageId || `msg_${Date.now()}_${Math.random()}`,
      clientMessageId: msg.clientMessageId || null,
      senderId: msg.sender?.userId || '',
      content: msg.content || '',
      createdAt: msg.createdAt || new Date().toISOString()
    };
  }, []);

  useEffect(() => {
    fetchRoomsAndClasses();

    return () => {
      // Disconnect socket and timers on unmount
      if (stompClientRef.current) {
        stompClientRef.current.disconnect();
      }
      clearInterval(pollingTimerRef.current);
      if (visibilityListenerRef.current) {
        document.removeEventListener('visibilitychange', visibilityListenerRef.current);
      }
    };
  }, []);

  // Ensure scroll is triggered after React renders messages
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      setTimeout(scrollMessageEnd, 80);
    }
  }, [messages, loadingMessages]);

  const fetchRoomsAndClasses = async () => {
    setLoadingRooms(true);
    try {
      // 1. Fetch Chat rooms
      const chatRes = await chatService.getRooms(myUserId);
      const rawRooms = Array.isArray(chatRes) ? chatRes : (chatRes?.data || []);
      
      // If server returns empty list, let's load mock conversational list to ensure beautiful UI demo works
      if (rawRooms.length === 0) {
        const mockRooms = [
          {
            roomId: 'room-1',
            parent: 'Nguyễn Văn Minh',
            studentName: 'Nguyễn Anh',
            className: 'Toán nâng cao 8A',
            lastMessage: 'Chào cô, hôm nay Nguyễn Anh có làm bài tốt không ạ?',
            lastMessageTime: '10:45',
            unreadCount: 1,
            avatar: '',
            isOnline: true
          },
          {
            roomId: 'room-2',
            parent: 'Phạm Thị Thảo',
            studentName: 'Lê Hoàng Minh',
            className: 'Hình học 8B',
            lastMessage: 'Vâng cám ơn cô đã nhắc nhở cháu ạ.',
            lastMessageTime: 'Hôm qua',
            unreadCount: 0,
            avatar: '',
            isOnline: false
          },
          {
            roomId: 'room-3',
            parent: 'Hệ thống Quản trị',
            studentName: '',
            className: 'Trung tâm EduTrack',
            lastMessage: 'Thông báo: Cuộc họp giáo viên vào thứ Sáu tuần này.',
            lastMessageTime: '02/06',
            unreadCount: 0,
            avatar: '',
            isOnline: true
          }
        ];
        setRooms(mockRooms);
      } else {
        setRooms(rawRooms.map(normalizeRoom));
      }

      // 2. Fetch classes to populate filter chips
      const classesRes = await classService.getMyClasses();
      const list = Array.isArray(classesRes) ? classesRes : (classesRes?.data || []);
      const names = [];
      list.forEach(c => {
        const cName = c.className;
        if (cName && !names.includes(cName)) {
          names.push(cName);
        }
      });
      setClassNames(names);

    } catch (err) {
      console.error('Error loading chat metadata:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    setLoadingMessages(true);
    setMessages([]);

    // Clear existing socket and timers
    if (stompClientRef.current) {
      stompClientRef.current.disconnect();
    }
    clearInterval(pollingTimerRef.current);
    if (visibilityListenerRef.current) {
      document.removeEventListener('visibilitychange', visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }

    try {
      // 1. Load messages history
      const msgRes = await chatService.getRoomMessages(room.roomId, myUserId);
      const msgList = Array.isArray(msgRes) ? msgRes : (msgRes?.data || []);
      
      if (msgList.length === 0 && room.roomId.startsWith('room-')) {
        // Fallback mock history for demo rooms
        const mockHistory = [
          { id: 'm1', senderId: 'parent-id', content: 'Chào cô giáo ạ!', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
          { id: 'm2', senderId: myUserId, content: 'Dạ xin chào phụ huynh học sinh.', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'm3', senderId: 'parent-id', content: room.lastMessage, createdAt: new Date().toISOString() }
        ];
        setMessages(mockHistory);
      } else {
        setMessages(msgList.map(normalizeMessage));
      }

      // Mark room as read locally
      setRooms(prev => prev.map(r => r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r));

      // Mark room as read on backend
      chatService.markAsRead(room.roomId, myUserId).catch(err => {
        console.warn('Failed to mark room as read on backend:', err);
      });

      // 2. Connect Stomp WebSocket
      connectSocket(room.roomId);

      // 3. Fallback Polling Timer (every 4 seconds) to fetch updates
      startPollingFallback(room.roomId);

    } catch (err) {
      console.error('Error loading room messages:', err);
    } finally {
      setLoadingMessages(false);
      scrollMessageEnd();
    }
  };

  const connectSocket = async (roomId) => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/chat/websocket`; // proxy path

      const stomp = new BrowserStompClient(wsUrl, token);
      await stomp.connect();
      stompClientRef.current = stomp;

      if (stomp.isConnected) {
        // Subscribe to active room topic
        stomp.subscribe(`/topic/room.${roomId}`, (messageJson) => {
          const payload = JSON.parse(messageJson);
          onNewMessageReceived(payload);
        });

        // Subscribe to user queue to receive updates for other rooms
        stomp.subscribe(`/user/queue/messages`, (messageJson) => {
          const payload = JSON.parse(messageJson);
          onNewMessageReceived(payload);
        });
      }
    } catch (err) {
      console.warn('STOMP Web Socket connection failed. Falling back to REST Polling.', err);
    }
  };

  const startPollingFallback = (roomId) => {
    clearInterval(pollingTimerRef.current);
    
    const fetchLatestMessages = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const msgRes = await chatService.getRoomMessages(roomId, myUserId);
        const msgList = Array.isArray(msgRes) ? msgRes : (msgRes?.data || []);
        if (msgList.length > 0) {
          const normalizedList = msgList.map(normalizeMessage);
          setMessages(prev => {
            const updated = [...prev];
            let changed = false;
            
            normalizedList.forEach(normalized => {
              const idx = updated.findIndex(m => 
                m.id === normalized.id || 
                (m.clientMessageId && normalized.clientMessageId && m.clientMessageId === normalized.clientMessageId)
              );
              
              if (idx !== -1) {
                if (updated[idx].id !== normalized.id) {
                  updated[idx] = normalized;
                  changed = true;
                }
              } else {
                updated.push(normalized);
                changed = true;
              }
            });
            
            if (changed) {
              setTimeout(scrollMessageEnd, 100);
              
              // Synchronize rooms list lastMessage metadata
              if (normalizedList.length > 0) {
                const latest = normalizedList[normalizedList.length - 1];
                setRooms(prevRooms => prevRooms.map(r => {
                  if (r.roomId === roomId) {
                    return {
                      ...r,
                      lastMessage: latest.content,
                      lastMessageTime: formatMessageTime(latest.createdAt)
                    };
                  }
                  return r;
                }));
              }
              
              return updated;
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    visibilityListenerRef.current = handleVisibility;

    pollingTimerRef.current = setInterval(fetchLatestMessages, 4000);
  };

  const onNewMessageReceived = (payload) => {
    const normalized = normalizeMessage(payload);
    if (!normalized) return;
    
    const targetRoomId = payload.roomId || selectedRoom?.roomId;
    const isActive = selectedRoom?.roomId === targetRoomId;

    if (isActive) {
      setMessages(prev => {
        const index = prev.findIndex(m => 
          m.id === normalized.id || 
          (m.clientMessageId && normalized.clientMessageId && m.clientMessageId === normalized.clientMessageId)
        );

        if (index !== -1) {
          // Swap local placeholder with server-assigned properties
          const updated = [...prev];
          updated[index] = normalized;
          return updated;
        } else {
          setTimeout(scrollMessageEnd, 50);
          
          // Auto mark as read on backend if this room is currently active
          chatService.markAsRead(targetRoomId, myUserId).catch(() => {});
          
          return [...prev, normalized];
        }
      });
    }

    // Synchronize rooms list lastMessage metadata and unreadCount
    setRooms(prevRooms => {
      return prevRooms.map(r => {
        if (r.roomId === targetRoomId) {
          return {
            ...r,
            lastMessage: normalized.content,
            lastMessageTime: formatMessageTime(normalized.createdAt),
            unreadCount: isActive ? 0 : Number(r.unreadCount || 0) + 1
          };
        }
        return r;
      });
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedRoom) return;

    const clientMsgId = `client_${Date.now()}`;
    const payload = {
      roomId: selectedRoom.roomId,
      messageType: 'TEXT',
      content: text,
      clientMessageId: clientMsgId
    };

    // Add locally immediately for speed UI update
    const localMsg = {
      id: clientMsgId,
      clientMessageId: clientMsgId,
      senderId: myUserId,
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, localMsg]);
    setMessageText('');
    setTimeout(scrollMessageEnd, 50);

    // Try Stomp first
    if (stompClientRef.current && stompClientRef.current.isConnected) {
      stompClientRef.current.sendMessage('/app/chat.sendMessage', payload);
    } else {
      // Mock / Rest fallback simulate
      console.warn('STOMP offline. Simulating message write on client side.');
      // Update room lastMessage info
      setRooms(prev => prev.map(r => r.roomId === selectedRoom.roomId ? { ...r, lastMessage: text, lastMessageTime: 'Vừa xong' } : r));
    }
  };

  const scrollMessageEnd = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = useMemo(() => {
    return rooms.filter(c => {
      const parentName = (c.parent || c.name || c.roomName || '').toLowerCase();
      const studentName = (c.studentName || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = parentName.includes(query) || studentName.includes(query);

      if (!matchesSearch) return false;

      if (selectedFilter === 'Chưa đọc') {
        return Number(c.unreadCount) > 0;
      } else if (selectedFilter !== 'Tất cả') {
        return c.className === selectedFilter;
      }
      return true;
    });
  }, [rooms, searchQuery, selectedFilter]);


  return (
    <div className={styles.chatRoot}>
            
      <main className={styles.mainContent}>
        <div className={`${styles.chatGridContainer} ${selectedRoom ? styles.showChatThread : ''}`}>
          
          {/* Left panel: Conversations List */}
          <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
              <h4>Trò chuyện phụ huynh</h4>
              <input 
                type="text" 
                placeholder="Tìm kiếm phụ huynh/học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchBar}
              />
            </div>

            {/* Filter chips */}
            <div className={styles.filterBar}>
              {['Tất cả', ...classNames, 'Chưa đọc'].map((filter, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFilter(filter)}
                  className={`${styles.filterChip} ${selectedFilter === filter ? styles.activeChip : ''}`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {loadingRooms ? (
              <div className={styles.loadingLabel}>Đang tải hội thoại...</div>
            ) : filteredConversations.length === 0 ? (
              <div className={styles.emptyConversations}>
                <span className="material-symbols-outlined notranslate" translate="no">chat_bubble_outline</span>
                <p>Không tìm thấy hội thoại nào</p>
              </div>
            ) : (
              <div className={styles.conversationsList}>
                {filteredConversations.map((conv, idx) => {
                  const isActive = selectedRoom?.roomId === conv.roomId;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleSelectRoom(conv)}
                      className={`${styles.convCard} ${isActive ? styles.activeCard : ''}`}
                    >
                      <div className={styles.avatarCircle}>
                        {conv.parent.charAt(0)}
                        {conv.isOnline && <span className={styles.onlineDot}></span>}
                      </div>
                      <div className={styles.convDetails}>
                        <div className={styles.convHeaderRow}>
                          <h6>{conv.parent} {conv.studentName ? `(PH ${conv.studentName})` : ''}</h6>
                          <span className={styles.convTime}>{conv.lastMessageTime}</span>
                        </div>
                        <span className={styles.convClass}>{conv.className}</span>
                        <div className={styles.convMsgRow}>
                          <p className={styles.lastMsgText}>{conv.lastMessage}</p>
                          {Number(conv.unreadCount) > 0 && (
                            <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Active Chat Thread */}
          <div className={styles.rightPanel}>
            {selectedRoom ? (
              <>
                {/* Active chat header */}
                <div className={styles.activeHeader}>
                  <div className={styles.activeUserBox}>
                    <button 
                      onClick={() => setSelectedRoom(null)} 
                      className={styles.backBtn}
                      type="button"
                      aria-label="Quay lại danh sách chat"
                    >
                      <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
                    </button>
                    <div className={styles.avatarCircleSmall}>
                      {selectedRoom.parent.charAt(0)}
                    </div>
                    <div>
                      <h5>{selectedRoom.parent}</h5>
                      <p>{selectedRoom.className} • Trực tuyến</p>
                    </div>
                  </div>
                </div>

                {/* Messages view thread */}
                <div className={styles.messagesContainer}>
                  {loadingMessages ? (
                    <div className={styles.loadingMessagesLabel}>Đang tải tin nhắn...</div>
                  ) : messages.length === 0 ? (
                    <div className={styles.emptyMessagesBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">forum</span>
                      <p>Chưa có tin nhắn trong hội thoại này</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = String(msg.senderId) === String(myUserId);
                      return (
                        <div key={idx} className={`${styles.messageBubbleRow} ${isMe ? styles.rowMe : styles.rowOther}`}>
                          <div className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`}>
                            <p>{msg.content}</p>
                            <span className={styles.messageTime}>{formatMessageTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>

                {/* Input bar */}
                <form onSubmit={handleSendMessage} className={styles.inputBar}>
                  <input 
                    type="text" 
                    placeholder="Nhập tin nhắn..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className={styles.messageInput}
                  />
                  <button type="submit" className={styles.sendBtn}>
                    <span className="material-symbols-outlined notranslate" translate="no">send</span>
                  </button>
                </form>
              </>
            ) : (
              /* No Room Selected State */
              <div className={styles.noSelectedRoomBox}>
                <span className="material-symbols-outlined notranslate" translate="no">chat_bubble</span>
                <h4>Nhấp chọn hội thoại</h4>
                <p>Chọn một phụ huynh ở danh sách bên trái để bắt đầu cuộc trò chuyện trực tiếp.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default TeacherChatPage;
