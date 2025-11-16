# 🎯 CHORD PROJESİ - FAZ ROADMAP

## 📋 Temel Yapı

- **Repo**: Monorepo (backend + frontend)
- **iOS**: Ayrı repo (sonraki faz)
- **Deployment**: Docker → Kendi sunucu/domain
- **Veritabanı**: SQL Server + Redis (Docker)

---

## 🏗️ FAZ 1: BACKEND FOUNDATION & AUTH

**Süre**: ~1-1.5 hafta
**DURUM**: ✅ %100 TAMAMLANDI

### Görevler

- [x] Proje iskeleti oluştur (dotnet new webapi, klasör yapısı)
- [x] Docker Compose (SQL Server + Redis)
- [x] NuGet paketleri (EF Core 9, JWT 8.2, BCrypt, SignalR Redis, FluentValidation 11, AutoMapper 12, Serilog 9)
- [x] AppDbContext + All entities (User, Guild, Channel, Message, GuildMember)
- [x] AuthService: Register, Login, Refresh Token (JWT + BCrypt)
- [x] Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`
- [x] Middleware: Global error handler ✅ | CORS ✅ | Rate limiting ✅
- [x] Serilog yapılandırması
- [x] Health check endpoint (`/health`)
- [x] Postman collection (Auth endpoints mevcut)
- [~] xUnit test projesi (Oluşturuldu, FAZ 10'da detaylandırılacak)

### Deliverables

✅ Kullanıcı kaydolup giriş yapabiliyor  
✅ JWT token alıp korumalı endpoint'e erişebiliyor  
✅ Docker Compose ile DB ayakta  
✅ Tüm auth endpoints test edildi ve çalışıyor  
✅ Global error handling middleware aktif (dev/prod aware)
✅ Rate limiting middleware aktif (100 req/min default)

---

## 🏗️ FAZ 2: GUILD & CHANNEL DOMAIN

**Süre**: ~1 hafta
**DURUM**: ✅ %100 TAMAMLANDI

### Görevler

- [x] Entities: Guild, GuildMember, Channel ✅
- [x] Migration: Guild-Channel ilişkileri (InitialCreate'de mevcut) ✅
- [x] DTOs: Guild, Channel için Create/Update/Response DTOs ✅
- [x] GuildService: CRUD, üye yönetimi (add/remove) ✅
- [x] ChannelService: CRUD, yetki kontrolü ✅
- [~] Authorization Policies: IsGuildMember, IsGuildOwner (Service içinde kontrol ediliyor, FAZ 9'da policy'ye çevrilecek)
- [x] Endpoints: Guilds CRUD, Channels CRUD, Members yönetimi ✅
- [~] Unit + integration testler (FAZ 10'da detaylandırılacak)

### Deliverables

✅ Guild oluşturma/yönetme çalışıyor  
✅ Kanal oluşturma/yönetme çalışıyor  
✅ Üyelik kontrolü aktif (service layer'da)

### 📝 Notlar

**Position System (Scoped by Type):**

- ✅ Channel position'ları type bazında izole edildi (TEXT: 0,1,2... VOICE: 0,1,2...)
- ✅ Unique index eklendi: `(GuildId, Type, Position)` - Duplicate position artık imkansız
- ✅ Migration: `ScopedChannelPositionByType` - Mevcut position'ları type bazında resetledi
- ✅ CREATE: Her type kendi max position'ını hesaplar, otomatik sona ekler
- ✅ UPDATE: Position değişiminde sadece aynı type'daki channel'ları kaydırır
- ✅ DELETE: Silinen channel'dan sonraki sadece aynı type'daki channel'ları yukarı kaydırır
- ✅ Frontend'te text/voice ayrımı için hazır (her grup 0'dan başlar)

**Middleware Güncellemeleri (Gerekirse):**

- Yeni exception tipi eklenirse → `GlobalExceptionMiddleware`'e case ekle
- Endpoint rate limit muafiyeti gerekirse → `RateLimitingMiddleware`'e whitelist ekle
- Şu an için tüm middleware'ler hazır, güncellemeye gerek yok ✅

---

## 🏗️ FAZ 3: SIGNALR & REAL-TIME MESSAGING

**Süre**: ~1.5 hafta
**DURUM**: ✅ %100 TAMAMLANDI (Integration testleri FAZ 10'da)

### Görevler

- [x] Message entity (content, attachments JSON, soft delete) ✅
- [x] ChatHub: JoinChannel, SendMessage, EditMessage, DeleteMessage, Typing ✅
- [x] ChatHub: Voice channel methods (JoinVoiceChannel, LeaveVoiceChannel, UpdateVoiceState) ✅
- [x] PresenceHub: Online/offline durumu, LastSeenAt ✅
- [x] Redis backplane konfigürasyonu ✅
- [x] Connection mapping service (SignalR built-in kullanılıyor) ✅
- [x] MessageService: CRUD, pagination ✅
- [x] REST endpoints (fallback): GET/POST /channels/{id}/messages ✅
- [x] Hub event dokümantasyonu (SIGNALR_EVENTS.md) ✅
- [x] Voice channel presence infrastructure ✅
- [~] SignalR integration testleri (FAZ 10'da detaylandırılacak)

### Deliverables

✅ Message entity ve DTOs hazır  
✅ MessageService: CRUD, pagination, soft delete  
✅ REST endpoints: GET/POST/PUT/DELETE messages  
✅ ChatHub: Real-time messaging (send, edit, delete, typing)  
✅ ChatHub: Voice channel presence (join, leave, mute/deafen state)  
✅ PresenceHub: Online/offline status tracking  
✅ Redis backplane configured  
✅ JWT authentication for SignalR  
✅ Kapsamlı event dokümantasyonu (text + voice)

### 📝 Notlar

**SignalR Configuration:**

- ✅ Hub endpoints: `/hubs/chat`, `/hubs/presence`
- ✅ JWT authentication via query string (`?access_token=...`)
- ✅ Redis backplane for horizontal scaling
- ✅ Automatic reconnection support
- ✅ Channel-based message broadcasting

**Message REST API:**

- ✅ `GET /api/channels/{channelId}/messages` - Paginated message list
- ✅ `GET /api/channels/{channelId}/messages/{id}` - Get single message
- ✅ `POST /api/channels/{channelId}/messages` - Create message
- ✅ `PUT /api/channels/{channelId}/messages/{id}` - Edit message (author only)
- ✅ `DELETE /api/channels/{channelId}/messages/{id}` - Soft delete (author or guild owner)

**SignalR Events:**

**Client → Server (Text Channels):**

- `JoinChannel(channelId)` - Subscribe to channel messages
- `LeaveChannel(channelId)` - Unsubscribe from channel
- `SendMessage(channelId, dto)` - Send message
- `EditMessage(channelId, messageId, dto)` - Edit message
- `DeleteMessage(channelId, messageId)` - Delete message
- `Typing(channelId)` - Broadcast typing indicator

**Client → Server (Voice Channels):**

- `JoinVoiceChannel(channelId)` - Join voice channel (show as active participant)
- `LeaveVoiceChannel(channelId)` - Leave voice channel
- `UpdateVoiceState(channelId, isMuted, isDeafened)` - Update mute/deafen status
- `GetVoiceChannelUsers(channelId)` - Get active voice participants

**Client → Server (Presence):**

- `GetOnlineUsers()` - Get online user list
- `UpdatePresence()` - Keep-alive ping

**Server → Client (Text):**

- `ReceiveMessage(message)` - New message broadcast
- `MessageEdited(message)` - Message edit broadcast
- `MessageDeleted(messageId)` - Message delete broadcast
- `UserTyping({ userId, username })` - Typing indicator

**Server → Client (Voice):**

- `UserJoinedVoiceChannel({ userId, username, displayName, isMuted, isDeafened })` - User joined voice
- `UserLeftVoiceChannel({ userId, channelId })` - User left voice
- `UserVoiceStateChanged({ userId, isMuted, isDeafened })` - User toggled mute/deafen

**Server → Client (Presence):**

- `UserOnline(userId)` - User came online
- `UserOffline(userId)` - User went offline
- `Error(message)` - Operation failed

**Authorization:**

- ✅ Message author can edit/delete own messages
- ✅ Guild owner can delete any message in guild
- ✅ Channel access controlled via guild membership
- ✅ Soft delete preserves message history

**Voice Channel Architecture:**

- ✅ **Text vs Voice separation**: `JoinChannel` (text message subscription) and `JoinVoiceChannel` (voice presence) are independent
- ✅ **Global online status**: PresenceHub tracks who's online in the app (not channel-specific)
- ✅ **Voice presence**: Shows who's actively in voice channels (visible to all, includes mute/deafen state)
- ✅ **Multiple simultaneous**: Users can be in one voice channel + viewing any text channel
- ✅ **State management**: Frontend tracks voice participants via join/leave/state change events
- 🔜 **WebRTC integration**: FAZ 8 will add actual audio streaming (STUN/TURN, P2P connections)

---

## 🏗️ FAZ 3.5: CORE UX FEATURES ⭐ YENİ

**Süre**: ~2-3 gün  
**DURUM**: ✅ %100 TAMAMLANDI  
**Neden şimdi**: Kolay implement + Frontend öncesi data model hazır olmalı + Discord temel özellikleri

### Görevler

#### 1. 😊 Message Reactions

- [x] MessageReaction entity (MessageId, UserId, Emoji, CreatedAt) ✅
- [x] Unique index: (MessageId, UserId, Emoji) ✅
- [x] API: POST/DELETE /messages/{id}/reactions ✅
- [x] GET /messages/{id}/reactions (grouped by emoji) ✅
- [x] ChatHub events: ReactionAdded, ReactionRemoved ✅
- [x] AutoMapper: ReactionResponseDto ✅
- [x] Migration: CreateMessageReactionsTable ✅

#### 2. 📌 Pinned Messages

- [x] Message entity'ye 3 alan ekle: IsPinned, PinnedAt, PinnedByUserId ✅
- [x] API: POST/DELETE /channels/{channelId}/messages/{messageId}/pin ✅
- [x] GET /channels/{channelId}/pins (list pinned messages) ✅
- [x] ChatHub events: MessagePinned, MessageUnpinned ✅
- [x] Authorization: Sadece guild owner/admin pin yapabilir (şimdilik owner) ✅
- [x] Migration: AddPinFieldsToMessages ✅

#### 3. 📍 Unread Messages

- [x] ChannelReadState entity (UserId, ChannelId, LastReadMessageId, LastReadAt) ✅
- [x] Composite key: (UserId, ChannelId) ✅
- [x] API: POST /channels/{channelId}/mark-read ✅
- [x] GET /channels/{channelId}/unread-count ✅
- [x] GET /users/me/unread-summary (tüm unread'ler) ✅
- [x] ChatHub: Auto-update read state on ReceiveMessage (optional) ✅
- [x] Migration: CreateChannelReadStatesTable ✅
- [x] LastReadMessageId DTO'lara eklendi (jump to unread özelliği) ✅
- [x] 99+ limit eklendi (performance) ✅

#### 4. 👤 User Status & Custom Status

- [x] UserStatus enum (Online, Idle, DoNotDisturb, Invisible, Offline) ✅
- [x] User entity'ye 2 alan: Status, CustomStatus ✅
- [x] API: PATCH /users/me/status ✅
- [x] PresenceHub: UpdateStatus method ✅
- [x] Server → Client: UserStatusChanged event ✅
- [x] Migration: AddStatusFieldsToUsers ✅
- [x] Offline durumu eklendi (disconnect olduğunda otomatik) ✅

### Deliverables

✅ Reactions çalışıyor (emoji ekle/çıkar, sayı göster)  
✅ Pinned messages çalışıyor (pin/unpin, listele)  
✅ Unread tracking çalışıyor (badge sayısı doğru)  
✅ User status çalışıyor (online/idle/dnd/invisible)

### 📝 Notlar

- **Neden frontend öncesi?** Frontend hazır olunca sadece UI bağlanacak, data model hazır olacak
- **Test edilebilir**: Swagger/Postman ile hepsi test edilebilir
- **Kolay**: Toplam ~200 satır kod, kompleks logic yok
- **Discord parity**: Bu 4 özellik Discord'un temel taşları

---

## 🏗️ FAZ 4: FRONTEND FOUNDATION & AUTH UI

**Süre**: ~1 hafta
**DURUM**: ✅ %100 TAMAMLANDI

### Görevler

- [x] Vite + React + TypeScript kurulumu ✅
- [x] Paketler: Redux Toolkit, React Router, Axios, SignalR Client, Tailwind, React Hook Form, Zod ✅
- [x] Redux store setup (authSlice, guildsSlice, channelsSlice, messagesSlice, presenceSlice) ✅
- [x] Axios instance: Base URL, JWT interceptor, 401 refresh token handler ✅
- [x] Auth API layer: register, login, refresh, getCurrentUser ✅
- [x] Login/Register sayfaları (form validation) ✅
- [x] ProtectedRoute component ✅
- [x] Token localStorage yönetimi ✅
- [x] Router setup (/, /login, /register, /channels/:guildId/:channelId) ✅ (ChannelView placeholder component ile)
- [x] Tailwind konfigürasyonu ✅
- [x] Base UI components: Button, Input, Spinner, Toast ✅

### Deliverables

✅ Login/register çalışıyor  
✅ Token yönetimi ve refresh logic aktif  
✅ Protected routes çalışıyor

---

## 🏗️ FAZ 5: FRONTEND GUILD & CHANNEL UI

**Süre**: ~1 hafta

### Görevler

- [ ] MainLayout (3-column: GuildSidebar | ChannelSidebar | Content)
- [ ] GuildSidebar: Guild ikonları listesi, create guild butonu
- [ ] ChannelSidebar: Kanal listesi, create channel butonu
- [ ] Redux thunks: fetchGuilds, createGuild, fetchChannels, createChannel
- [ ] Modal components: CreateGuildModal, CreateChannelModal
- [ ] Guild/Channel seçme logic (route navigation)
- [ ] Active state styling
- [ ] API integration (REST)

### Deliverables

✅ Guild listesi görünüyor  
✅ Kanal listesi görünüyor  
✅ Guild/kanal oluşturma çalışıyor  
✅ Navigasyon doğru çalışıyor

---

## 🏗️ FAZ 5.5: GUILD INVITES ⭐ YENİ

**Süre**: ~1 gün  
**DURUM**: ⏳ Başlanmadı  
**Neden bu aşamada**: Frontend'de guild yönetimi UI'ı hazır olunca link paylaşımı test edilebilir

### Backend Görevler

- [ ] GuildInvite entity (Id, Code, GuildId, CreatedByUserId, CreatedAt, ExpiresAt, MaxUses, Uses)
- [ ] Unique index: Code (8 karakterlik random: "abc123XY")
- [ ] API: POST /guilds/{id}/invites (create invite)
- [ ] GET /invites/{code} (get invite info - public endpoint)
- [ ] POST /invites/{code}/accept (join guild via invite)
- [ ] GET /guilds/{id}/invites (list guild invites)
- [ ] DELETE /invites/{id} (revoke invite)
- [ ] Validation: Max uses, expiry check, already member check
- [ ] Migration: CreateGuildInvitesTable

### Frontend Görevler

- [ ] InviteModal component (create invite form: expiry, max uses)
- [ ] InviteList component (guild settings'te aktif inviteler)
- [ ] InviteAcceptPage (/invite/:code route)
- [ ] Copy invite link butonu
- [ ] Toast notifications (invite created, copied, accepted)
- [ ] Invite preview card (guild name, icon, member count)

### Deliverables

✅ Invite link oluşturma çalışıyor  
✅ Link ile guild'e katılma çalışıyor  
✅ Expiry ve max uses limitleri doğru çalışıyor  
✅ Frontend'de davet yönetimi UI'ı tamamlandı

---

## 🏗️ FAZ 6: FRONTEND MESSAGING & SIGNALR

**Süre**: ~1.5 hafta

### Görevler

- [ ] SignalR connection hook (useSignalR)
- [ ] ChatHub event listeners (ReceiveMessage, MessageEdited, MessageDeleted, UserTyping)
- [ ] PresenceHub event listeners (UserOnline, UserOffline)
- [ ] MessageList component (infinite scroll, auto-scroll to bottom)
- [ ] MessageItem component (avatar, content, edit/delete buttons, timestamp)
- [ ] MessageComposer component (textarea, enter to send, typing trigger)
- [ ] Messages Redux slice (messagesByChannel state yönetimi)
- [ ] ChannelView page (header, message list, composer layout)
- [ ] JoinChannel/LeaveChannel invoke (route değişiminde)
- [ ] Typing indicator UI
- [ ] MemberList component (online kullanıcılar - opsiyonel)
- [ ] Pagination/load more logic

### Deliverables

✅ Mesajlar listeleniyor  
✅ Gerçek zamanlı mesaj gönderme/alma çalışıyor  
✅ Edit/delete çalışıyor  
✅ Typing indicator görünüyor  
✅ Online kullanıcılar görünüyor

---

## 🏗️ FAZ 6.5: MENTIONS & NOTIFICATIONS ⭐ YENİ

**Süre**: ~1-2 gün  
**DURUM**: ⏳ Başlanmadı  
**Neden bu aşamada**: Mesajlaşma UI hazır, mention parse ve bildirim gönderilebilir

### Backend Görevler

- [ ] MessageMention entity (MessageId, MentionedUserId, IsRead, CreatedAt)
- [ ] MessageService: ExtractMentions helper (regex: @username → userId)
- [ ] CreateMessage'da mention parse + MessageMention kaydet
- [ ] API: GET /users/me/mentions?unread=true
- [ ] PATCH /mentions/{id}/mark-read
- [ ] ChatHub: Server → Client event: UserMentioned
- [ ] Migration: CreateMessageMentionsTable

### Frontend Görevler

- [ ] MessageComposer: @ yazınca autocomplete (guild members)
- [ ] MessageItem: Mention highlight (blue background)
- [ ] MentionsPanel component (unread mentions listesi)
- [ ] Badge on user avatar (unread mention count)
- [ ] Browser notification (Notification API)
- [ ] Click to jump to mentioned message

### Deliverables

✅ @mention autocomplete çalışıyor  
✅ Mention edilen kullanıcıya bildirim gidiyor  
✅ Unread mentions listesi çalışıyor  
✅ Click to jump çalışıyor

---

## 🏗️ FAZ 7: FILE UPLOAD & VIDEO SUPPORT

**Süre**: ~1 hafta

### Backend

- [ ] MinIO Docker container (veya Azure Blob)
- [ ] StorageService: Upload, Delete, Presigned UackRL
- [ ] POST /api/upload endpoint (multipart, validation: boyut, tip, süre)
- [ ] Message.Attachments JSON yapısı (url, type, size, name, duration)

### Frontend

- [ ] FileUploadButton component
- [ ] Upload API client (FormData, progress bar)
- [ ] VideoAttachment component (inline player)
- [ ] ImageAttachment component (thumbnail + lightbox)
- [ ] Composer'a upload butonu entegrasyonu
- [ ] Preview ve limit uyarıları

### Deliverables

✅ Dosya yükleme çalışıyor  
✅ Video inline oynatılıyor  
✅ Resim thumbnail + lightbox  
✅ Boyut/süre limitleri kontrol ediliyor

---

## 🏗️ FAZ 8: VOICE CHANNELS & WEBRTC

**Süre**: ~2 hafta

### Backend

- [ ] Coturn STUN/TURN server (Docker)
- [ ] RtcSignalingHub: Offer, Answer, IceCandidate relay
- [ ] VoiceSession yönetimi (kimin hangi odada olduğu)
- [ ] Channel type'a göre VoiceChannel validasyonu

### Frontend

- [ ] WebRTC P2P bağlantı logic (RTCPeerConnection)
- [ ] Voice channel UI (join/leave butonları)
- [ ] VoiceRoom component (katılımcı listesi, mute/unmute)
- [ ] RtcSignalingHub event listeners (offer, answer, ice)
- [ ] Mikrofon izni kontrolü
- [ ] Audio stream yönetimi (mute/unmute, disconnect)
- [ ] Max 5 kişi limiti kontrolü
- [ ] Error handling (bağlantı hatası, retry)

### Deliverables

✅ Sesli kanala katılma çalışıyor  
✅ P2P ses iletişimi stabil (3-5 kişi)  
✅ Mute/unmute çalışıyor  
✅ STUN/TURN ile NAT geçişi

---

## 🏗️ FAZ 9: PERMISSIONS & ROLES

**Süre**: ~3-4 gün

### Görevler

- [ ] GuildMember.Role field (Owner, Admin, Member)
- [ ] ChannelPermission entity (CanRead, CanWrite, CanSpeak)
- [ ] Authorization handlers (rol bazlı politikalar)
- [ ] Permission check middleware/service
- [ ] Frontend: Permission-based UI (buton gizleme, disable)
- [ ] Admin panel UI (basit rol değiştirme - opsiyonel)

### Deliverables

✅ Rol bazlı yetkilendirme çalışıyor  
✅ Yetkisiz işlemlerde 403  
✅ Frontend permission'a göre butonlar görünüyor

---

## 🏗️ FAZ 9.5: DIRECT MESSAGES & FRIENDS ⭐ YENİ

**Süre**: ~3-4 gün  
**DURUM**: ⏳ Başlanmadı  
**Neden bu aşamada**: Permissions hazır, private messaging için rol sistemi gerekli

### Backend Görevler

#### 1. Friend System

- [ ] Friendship entity (Id, RequesterId, AddresseeId, Status, CreatedAt, AcceptedAt)
- [ ] FriendshipStatus enum (Pending, Accepted, Blocked)
- [ ] Unique index: (RequesterId, AddresseeId)
- [ ] API: POST /friends/request
- [ ] POST /friends/{id}/accept, /decline, /block
- [ ] DELETE /friends/{id} (unfriend)
- [ ] GET /friends, /friends/pending, /friends/blocked
- [ ] Migration: CreateFriendshipsTable

#### 2. Direct Messages

- [ ] ChannelType.DirectMessage ekle
- [ ] DirectMessageChannel entity (ChannelId, User1Id, User2Id)
- [ ] Unique index: (User1Id, User2Id) where User1Id < User2Id
- [ ] API: POST /users/{userId}/dm (create/get DM channel)
- [ ] GET /users/me/dms (list all DM channels)
- [ ] Permission check: Sadece friends DM gönderebilir
- [ ] ChatHub: DM channel'lar için aynı message logic
- [ ] Migration: AddDirectMessageSupport

### Frontend Görevler

- [ ] FriendsTab component (sidebar'da guild listesinin altında)
- [ ] FriendsList component (online/offline/pending)
- [ ] AddFriendModal (username ile ekleme)
- [ ] DMChannelList (DM listesi, son mesaj önizlemesi)
- [ ] DMChannel route (/dm/:channelId)
- [ ] Accept/decline friend request butonları
- [ ] Online status indicator (friend list)

### Deliverables

✅ Arkadaş ekleme/kabul etme çalışıyor  
✅ DM channel oluşturma çalışıyor  
✅ Friend-only DM kontrolü çalışıyor  
✅ Frontend'de DM UI tamamlandı

---

## 🏗️ FAZ 10: TESTING & OBSERVABILITY

**Süre**: ~4-5 gün (Audit Log eklendi)  
**DURUM**: ⏳ Başlanmadı

### Görevler

#### Mevcut Testler

- [ ] xUnit testlerini düzelt ve genişlet (AuthService testleri hazır ama çalışmıyor)
- [ ] Unit test coverage artırma (≥70% hedef)
  - AuthService ✅ (13 test case hazır, düzeltilecek)
  - GuildService testleri
  - ChannelService testleri
  - MessageService testleri
- [ ] Integration testler (WebApplicationFactory)
- [ ] OpenTelemetry kurulumu (traces, metrics)
- [ ] Health checks genişletme (Redis, MinIO)

#### ⭐ YENİ: Audit Log

- [ ] AuditLog entity (Id, GuildId, UserId, Action, TargetType, TargetId, Changes, IpAddress, Timestamp)
- [ ] AuditAction enum (MemberJoin, MemberKick, ChannelCreate, MessageDelete, RoleUpdate, etc.)
- [ ] Middleware: AuditLogMiddleware (önemli işlemleri logla)
- [ ] Service method'larına audit log kaydetme
- [ ] API: GET /guilds/{id}/audit-logs?limit=50
- [ ] Frontend: AuditLogPanel (guild settings)
- [ ] Migration: CreateAuditLogsTable

### Frontend (Mevcut)

- [ ] Component testleri (kritik flow'lar)
- [ ] E2E testler (Playwright veya Cypress): Login → Guild → Mesaj gönder
- [ ] Performance profiling

### Deliverables

✅ Test coverage ≥60%  
✅ E2E testler ana akışı kapsıyor  
✅ Metrik/trace dashboard görünür  
✅ Audit log çalışıyor (kim ne yaptı izlenebiliyor)

### 📝 Test Notları

**xUnit Test Projesi (ChordAPI.Tests):**

- ✅ Proje oluşturuldu (FAZ 1'de)
- ✅ Test infrastructure hazır (InMemory DB, Moq, xUnit)
- ⚠️ AuthService için 13 test case yazıldı ama method signature hatası var
- ⏳ FAZ 10'da tüm testler düzeltilip genişletilecek
- 📦 Test Packages: xUnit 2.9.2, Moq 4.20.72, EF Core InMemory 9.0.0

---

## 🏗️ FAZ 11: PERFORMANCE & SECURITY

**Süre**: ~4-5 gün (Notification Settings eklendi)  
**DURUM**: ⏳ Başlanmadı

### Görevler (Mevcut)

- [ ] Load testing (K6 veya Locust): 1K eşzamanlı bağlantı
- [ ] Rate limiting iyileştirme (Redis-based distributed)
- [ ] Input validation sertleştirme
- [ ] CORS politikası güncelleme (production domain)
- [ ] TLS/HTTPS yapılandırması (Let's Encrypt)
- [ ] SQL injection/XSS kontrolleri
- [ ] Sensitive data masking (logs)
- [ ] Password policy enforcement

### ⭐ YENİ: Notification Settings

- [ ] NotificationSetting entity (UserId, GuildId, ChannelId, NotifyOnMessage, NotifyOnMention, NotifyOnReply, MuteUntil)
- [ ] Default settings (all channels: all notifications)
- [ ] API: GET/PATCH /users/me/notification-settings
- [ ] Scope: Global, Guild, Channel (cascading)
- [ ] Frontend: NotificationSettingsModal (per-channel veya global)
- [ ] Mute channel (1h, 8h, 24h, until unmute)
- [ ] Browser notification filtering (settings'e göre)
- [ ] Migration: CreateNotificationSettingsTable

### Deliverables

✅ 1K bağlantıda kabul edilebilir gecikme  
✅ Güvenlik best practices uygulanmış  
✅ Production-ready TLS  
✅ Bildirim tercihleri çalışıyor (mute/unmute)

---

## 🏗️ FAZ 12: DEPLOYMENT & DOCUMENTATION

**Süre**: ~1 hafta

### Görevler

- [ ] Production Dockerfile (backend + frontend)
- [ ] Docker Compose production config
- [ ] GitHub Actions CI/CD (build → test → deploy)
- [ ] Sunucuya deployment (domain bağlama, SSL)
- [ ] Environment variables yönetimi
- [ ] API dokümantasyonu (Swagger/Redoc)
- [ ] README: Kurulum, kullanım, mimari diyagram
- [ ] ER diagram güncel
- [ ] Postman collection export
- [ ] Demo senaryosu hazırlama
- [ ] Video demo kaydı

### Deliverables

✅ Uygulama production'da çalışıyor (domain üzerinden erişilebilir)  
✅ CI/CD pipeline aktif  
✅ Dokümantasyon tamamlanmış  
✅ Demo videosu hazır

---

## 🎯 YENİ ÖNCELİK SIRASI

1. **Faz 1-3** ✅ Core backend (auth, messaging, real-time)
2. **Faz 3.5** ✅ Core UX Features (Reactions, Pins, Unread, Status)
3. **Faz 4** ✅ Frontend temel yapı + auth UI
4. **Faz 5** 🟡 **ŞİMDİ YAPILACAK** → Frontend Guild & Channel UI
5. **Faz 5.5, 6.5** → Guild invites, Mentions (frontend hazır olduktan sonra)
6. **Faz 7-8** → File upload, voice channels
7. **Faz 9-9.5** → Permissions + DMs + Friends
8. **Faz 10-11** → Testing, audit log, notifications, security
9. **Faz 12** → Production deployment

---

## 🚀 SONRAKİ ADIM: FAZ 5

**Hemen yapılacaklar:**

1. MainLayout (3-column: GuildSidebar | ChannelSidebar | Content)
2. GuildSidebar: Guild ikonları listesi, create guild butonu
3. ChannelSidebar: Kanal listesi, create channel butonu
4. Redux thunks: fetchGuilds, createGuild, fetchChannels, createChannel
5. Modal components: CreateGuildModal, CreateChannelModal
6. Guild/Channel seçme logic (route navigation)
7. Active state styling
8. API integration (REST)

**Tahmini süre**: ~1 hafta  
**Test edilebilir**: Guild listesi görünecek, kanal listesi görünecek, guild/kanal oluşturma çalışacak

---

## 📊 ÖZELLIK ÖZETİ

| Özellik               | Faz | Zorluk    | Frontend Bağımlılığı | Öncelik    |
| --------------------- | --- | --------- | -------------------- | ---------- |
| Reactions             | 3.5 | Kolay     | Hayır                | ⭐⭐⭐⭐⭐ |
| Pinned Messages       | 3.5 | Çok Kolay | Hayır                | ⭐⭐⭐⭐   |
| Unread Messages       | 3.5 | Kolay     | Hayır                | ⭐⭐⭐⭐⭐ |
| User Status           | 3.5 | Çok Kolay | Hayır                | ⭐⭐⭐     |
| Guild Invites         | 5.5 | Orta      | Evet (Guild UI)      | ⭐⭐⭐⭐   |
| Mentions              | 6.5 | Orta      | Evet (Message UI)    | ⭐⭐⭐⭐   |
| DMs                   | 9.5 | Orta      | Evet (Permissions)   | ⭐⭐⭐⭐   |
| Friends               | 9.5 | Orta      | Evet (Permissions)   | ⭐⭐⭐     |
| Audit Log             | 10  | Kolay     | Hayır                | ⭐⭐⭐     |
| Notification Settings | 11  | Orta      | Evet (Full UI)       | ⭐⭐⭐     |

---
