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

**Channel Types:**

- ✅ Text (0) - Normal text messaging channels
- ✅ Voice (1) - Voice communication channels
- ✅ Announcement (2) - Announcement-only channels (FAZ 5.7'de tamamlandı)

**Default Channels:**

- ✅ Guild oluşturulduğunda otomatik olarak "general" text channel ve "Lobby" voice channel oluşturuluyor
- ✅ GuildService.CreateGuildAsync içinde IChannelService kullanılarak otomatik channel oluşturma eklendi

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
- [x] User entity default status → Offline (yeni kullanıcılar offline başlıyor) ✅
- [x] PresenceHub OnDisconnectedAsync → status Offline'a set ediliyor ✅
- [x] Database migration → mevcut kullanıcılar Offline olarak güncellendi ✅
- [x] Members listesinde doğru online/offline durumu gösteriliyor ✅

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
**DURUM**: ✅ %100 TAMAMLANDI

### Görevler

- [x] MainLayout (3-column: GuildSidebar | ChannelSidebar | Content) ✅
- [x] GuildSidebar: Guild ikonları listesi, create guild butonu ✅
- [x] ChannelSidebar: Kanal listesi, create channel butonu ✅
- [x] Redux thunks: fetchGuilds, createGuild, fetchChannels, createChannel ✅
- [x] Modal components: CreateGuildModal, CreateChannelModal ✅
- [x] Guild/Channel seçme logic (route navigation) ✅
- [x] Active state styling ✅
- [x] API integration (REST) ✅
- [x] Text/Voice channel separation (separate create modals) ✅
- [x] Guild tooltip on hover (guild info display) ✅
- [x] Hover effects (guild buttons, channel items, friend items) ✅
- [x] ESC key support for all modals ✅

### Deliverables

✅ Guild listesi görünüyor  
✅ Kanal listesi görünüyor  
✅ Guild/kanal oluşturma çalışıyor  
✅ Navigasyon doğru çalışıyor
✅ Text ve voice channel'lar ayrı yönetiliyor
✅ Hover effects ve tooltips çalışıyor

### 📝 Notlar

**Channel Types Support:**

- ✅ Text channels (type 0) - Full support
- ✅ Voice channels (type 1) - Full support
- ✅ Announcement channels (type 2) - Full support (FAZ 5.7'de eklendi)

**Guild Sıralama:**

- ✅ Guild'lar kullanıcının katılma tarihine göre sıralanıyor (en yeni katıldığı üstte)
- ✅ Backend'de `GetUserGuildsAsync` metodunda `OrderByDescending(gm => gm.JoinedAt)` eklendi
- ✅ Frontend'de yeni guild oluşturulduğunda `unshift` ile en başa ekleniyor

---

## 🏗️ FAZ 5.3: VOICE CHANNEL UI INFRASTRUCTURE ⭐ YENİ

**Süre**: ~2-3 gün  
**DURUM**: ✅ %100 TAMAMLANDI (UI Altyapısı)  
**Neden bu aşamada**: Voice channel presence backend hazır (FAZ 3), UI altyapısı frontend'de hazır olmalı

### Frontend Görevler

- [x] UserProfileBar component (global bottom bar, status display, mute/deafen controls) ✅
- [x] VoiceBar component (voice channel connection status, disconnect button) ✅
- [x] VoiceChannelUsers component (display users in voice channel) ✅
- [x] UserVoiceModal component (user-specific voice actions: mute, deafen, move, kick, ban) ✅
- [x] Redux state: activeVoiceChannelId, voiceChannelUsers (channelId → users mapping) ✅
- [x] Voice channel join/leave logic (no navigation, background presence) ✅
- [x] Text + Voice simultaneous support (can view text channel while in voice) ✅
- [x] Single voice channel limit (only one active at a time, auto-leave previous) ✅
- [x] Voice channel user list (shows muted/deafened status) ✅
- [x] Mute/deafen state sync (UserProfileBar ↔ VoiceChannelUsers) ✅
- [x] Voice channel click behavior (join only, leave via VoiceBar disconnect button) ✅

### Deliverables

✅ Voice channel UI altyapısı tamamlandı  
✅ Voice channel'a join/leave çalışıyor (UI)  
✅ Voice channel kullanıcı listesi görünüyor  
✅ Mute/deafen controls çalışıyor (local state)  
✅ Text + Voice aynı anda destekleniyor  
✅ VoiceBar connection status gösterimi hazır

### 📝 Notlar

**UI Altyapısı Tamamlandı:**

- ✅ Voice channel presence UI hazır
- ✅ User actions (mute/deafen) UI hazır
- ✅ User moderation UI hazır (UserVoiceModal)
- ✅ SignalR integration tamamlandı (FAZ 6'da eklendi)

**SignalR Integration (FAZ 6'da tamamlandı):**

- [x] ChatHub.JoinVoiceChannel invoke (voice channel'a join) ✅
- [x] ChatHub.LeaveVoiceChannel invoke (voice channel'dan leave) ✅
- [x] ChatHub.UpdateVoiceState invoke (mute/deafen toggle) ✅
- [x] ChatHub event listeners:
  - [x] UserJoinedVoiceChannel (add user to list) ✅
  - [x] UserLeftVoiceChannel (remove user from list) ✅
  - [x] UserVoiceStateChanged (update user mute/deafen state) ✅
- [ ] ChatHub moderation methods (FAZ 9'da permissions ile):
  - [ ] MuteUser (admin/owner only)
  - [ ] DeafenUser (admin/owner only)
  - [ ] MoveUser (admin/owner only)
  - [ ] KickUser (admin/owner only)
  - [ ] BanUser (admin/owner only)

**Voice Channel Architecture:**

- ✅ **Text vs Voice separation**: Text channel navigation independent from voice presence
- ✅ **Single voice limit**: Only one voice channel active at a time
- ✅ **Background presence**: Voice channel works in background, doesn't affect text channel viewing
- ✅ **State management**: Redux tracks activeVoiceChannelId and voiceChannelUsers
- ✅ **SignalR integration**: FAZ 6'da real-time updates eklendi
- 🔜 **WebRTC streaming**: FAZ 8'de actual audio streaming eklenecek

---

## 🏗️ FAZ 5.5: GUILD INVITES ⭐ YENİ

**Süre**: ~1 gün  
**DURUM**: ✅ %100 TAMAMLANDI  
**Neden bu aşamada**: Frontend'de guild yönetimi UI'ı hazır olunca link paylaşımı test edilebilir

### Backend Görevler

- [x] GuildInvite entity (Id, Code, GuildId, CreatedByUserId, CreatedAt, ExpiresAt, MaxUses, Uses) ✅
- [x] Unique index: Code (8 karakterlik random: "abc123XY") ✅
- [x] API: POST /invites/guilds/{id} (create invite) ✅
- [x] GET /invites/{code} (get invite info - public endpoint) ✅
- [x] POST /invites/{code}/accept (join guild via invite) ✅
- [x] GET /invites/guilds/{id} (list guild invites) ✅
- [x] DELETE /invites/{id} (revoke invite) ✅
- [x] Validation: Max uses, expiry check, already member check ✅
- [x] Migration: CreateGuildInvitesTable ✅
- [x] InviteService: CreateInviteAsync, GetInviteByCodeAsync, AcceptInviteAsync, GetGuildInvitesAsync, RevokeInviteAsync ✅
- [x] DTOs: CreateInviteDto, InviteResponseDto, InviteInfoDto ✅

### Frontend Görevler

- [x] InviteModal component (create invite form: expiry, max uses) ✅
- [x] InviteAcceptPage (/invite/:code route) ✅
- [x] Copy invite link butonu ✅
- [x] Toast notifications (invite created, copied, accepted) ✅
- [x] Invite preview card (guild name, icon, member count, created by username) ✅
- [x] ChannelSidebar'da "Invite People" butonu ✅
- [x] CreateGuildModal'a "Join Guild" tab'ı eklendi (invite code ile katılma) ✅
- [x] Login/Register sonrası invite code korunuyor ve invite sayfasına yönlendiriliyor ✅
- [x] Invite ekranında davet eden kişi bilgisi gösteriliyor ✅

### Deliverables

✅ Invite link oluşturma çalışıyor  
✅ Link ile guild'e katılma çalışıyor  
✅ Expiry ve max uses limitleri doğru çalışıyor  
✅ Frontend'de davet yönetimi UI'ı tamamlandı  
✅ CreateGuildModal'dan invite code ile guild'e katılma özelliği eklendi  
✅ Login/Register akışında invite code korunuyor  
✅ Invite ekranında davet eden kişi bilgisi gösteriliyor

---

## 🏗️ FAZ 5.7: ANNOUNCEMENT CHANNELS ⭐ YENİ

**Süre**: ~1 gün  
**DURUM**: ✅ %100 TAMAMLANDI  
**Neden bu aşamada**: Database'de type 2 olarak mevcut ama enum'da tanımlı değil, frontend'de desteklenmiyor

### Backend Görevler

- [x] ChannelType enum'a `Announcement = 2` ekle (`backend/Models/Entities/Channel.cs`) ✅
- [x] Frontend `ChannelType` constant'a `Announcement: 2` ekle (`frontend/src/lib/api/channels.ts`) ✅
- [x] CreateChannelModal'a Announcement seçeneği ekle ✅
- [x] ChannelSidebar'da Announcement channel'ları ayrı bir bölümde göster (Text Channels, Voice Channels, Announcement Channels) ✅
- [x] Announcement channel'lar için özel icon (megaphone icon) ✅
- [x] Announcement channel validation: Text channel gibi çalışıyor (okuma/yazma) ✅

### Frontend Görevler

- [x] ChannelType constant güncellemesi ✅
- [x] CreateChannelModal'da Announcement seçeneği ✅
- [x] ChannelSidebar'da Announcement channel'ları ayrı göster (en üstte) ✅
- [x] Announcement channel icon (megaphone) ✅
- [x] Announcement channel UI styling (text channel gibi çalışıyor) ✅

### Deliverables

✅ Announcement channel type backend'de tanımlı  
✅ Announcement channel oluşturma çalışıyor  
✅ Frontend'de Announcement channel'lar görünüyor  
✅ Announcement channel'lar için özel icon ve styling

### 📝 Notlar

**Tamamlanan Özellikler:**

- ✅ Backend enum'da `Announcement = 2` tanımlı
- ✅ Frontend'de Announcement desteği tam
- ✅ Position system Announcement'ı da destekliyor (type bazında izole)
- ✅ Announcement channel'lar ChannelSidebar'da en üstte gösteriliyor
- ✅ Text channel gibi çalışıyor (okuma/yazma)

**Gelecek İyileştirmeler (Opsiyonel):**

- Read-only mode (sadece guild owner/admin yazabilir)
- Özel görünüm (farklı renk, icon)
- Auto-follow (tüm guild üyeleri otomatik takip eder)

---

## 🏗️ FAZ 6: FRONTEND MESSAGING & SIGNALR

**Süre**: ~1.5 hafta
**DURUM**: ✅ %100 TAMAMLANDI

### Görevler

- [x] SignalR connection hook (useSignalR + useSignalRConnectionManager) ✅
- [x] ChatHub event listeners (ReceiveMessage, MessageEdited, MessageDeleted, UserTyping) ✅
- [x] PresenceHub event listeners (UserOnline, UserOffline, UserStatusChanged, StatusUpdated) ✅
- [x] **Voice Channel SignalR Integration:**
  - [x] ChatHub.JoinVoiceChannel invoke (on voice channel click) ✅
  - [x] ChatHub.LeaveVoiceChannel invoke (on disconnect or channel switch) ✅
  - [x] ChatHub.UpdateVoiceState invoke (on mute/deafen toggle) ✅
  - [x] ChatHub event listeners:
    - [x] UserJoinedVoiceChannel (add user to voiceChannelUsers) ✅
    - [x] UserLeftVoiceChannel (remove user from voiceChannelUsers) ✅
    - [x] UserVoiceStateChanged (update user mute/deafen state) ✅
- [x] MessageList component (infinite scroll, pagination, message grouping) ✅
- [x] MessageItem component (Discord-like grouping, avatar, content, edit/delete buttons, timestamp formatting) ✅
- [x] MessageComposer component (textarea, enter to send, typing trigger) ✅
- [x] Messages Redux slice (messagesByChannel, typingUsers state yönetimi) ✅
- [x] ChannelView page (header, message list, composer layout) ✅
- [x] JoinChannel/LeaveChannel invoke (route değişiminde) ✅
- [x] Typing indicator UI ✅
- [x] MemberList component (guild members with online/offline status, role sorting) ✅
- [x] Pagination/load more logic (cursor-based) ✅

### Ek Özellikler (Bonus)

- [x] **Status Preservation**: User status (Idle, DND, Invisible) preserved on browser close/reopen ✅
- [x] **Message Grouping**: Discord-like message grouping (same user consecutive messages within 5 minutes) ✅
- [x] **Message Timestamp Formatting**: Same day → time only, different day → date + time ✅
- [x] **Status Update Modal**: Quick status change modal (upward-opening) ✅
- [x] **User Settings Modal**: Categorized settings modal (My Account, Voice & Video, etc.) ✅
- [x] **Rate Limiting Optimizations**: Redux caching for guild members/channels, SignalR connection manager ✅
- [x] **Delete Message Modal**: Custom confirmation modal (replaces browser confirm) ✅
- [x] **Invisible Status Handling**: Invisible users appear as Offline to others ✅
- [x] **DND Status Grouping**: Do Not Disturb users grouped under Online category ✅
- [x] **Custom Scrollbar Styling**: Modern, ince scrollbar (mesaj listesi için) ✅

### Deliverables

✅ Mesajlar listeleniyor (Discord-like grouping)  
✅ Gerçek zamanlı mesaj gönderme/alma çalışıyor  
✅ Edit/delete çalışıyor (SignalR instant updates)  
✅ Typing indicator görünüyor  
✅ Online kullanıcılar görünüyor (MemberList)  
✅ Voice channel SignalR integration tamamlandı  
✅ Status preservation çalışıyor  
✅ Message timestamp formatting çalışıyor

---

## 🏗️ FAZ 6.5: MENTIONS & NOTIFICATIONS ⭐ YENİ

**Süre**: ~1-2 gün  
**DURUM**: ✅ %100 TAMAMLANDI  
**Neden bu aşamada**: Mesajlaşma UI hazır, mention parse ve bildirim gönderilebilir

### Backend Görevler

- [x] MessageMention entity (MessageId, MentionedUserId, IsRead, CreatedAt) ✅
- [x] MessageService: ExtractMentions helper (regex: @username → userId) ✅
- [x] CreateMessage'da mention parse + MessageMention kaydet ✅
- [x] API: GET /api/mentions?unreadOnly=true ✅
- [x] GET /api/mentions/unread-count ✅
- [x] PATCH /api/mentions/{id}/mark-read ✅
- [x] PATCH /api/mentions/mark-all-read (guildId ile filtreleme desteği) ✅
- [x] ChatHub: Server → Client event: UserMentioned ✅
- [x] Migration: CreateMessageMentionsTable ✅
- [x] MentionService ve IMentionService oluşturuldu ✅
- [x] MentionsController ve API endpoints eklendi ✅
- [x] MarkAllMentionsAsReadAsync metodu (verimli batch update) ✅

### Frontend Görevler

- [x] MessageComposer: @ yazınca autocomplete (guild members) ✅
- [x] MessageItem: Mention highlight (blue background) ✅
- [x] MentionsPanel component (unread mentions listesi) ✅
- [x] Badge on user avatar (unread mention count) ✅
- [x] Browser notification (Notification API) ✅
- [x] Click to jump to mentioned message ✅
- [x] Mentions Redux slice oluşturuldu ✅
- [x] Mentions API client eklendi ✅
- [x] Guild filtreleme (sadece aktif guild'in mentions'ları gösteriliyor) ✅
- [x] "Mark all as read" butonu (header'da, sadece unread varsa görünüyor) ✅
- [x] Self-mention prevention (@ autocomplete'te kendini mention edemez) ✅

### Deliverables

✅ @mention autocomplete çalışıyor  
✅ Mention edilen kullanıcıya bildirim gidiyor  
✅ Unread mentions listesi çalışıyor  
✅ Click to jump çalışıyor  
✅ Guild filtreleme çalışıyor (aktif guild'in mentions'ları)  
✅ "Mark all as read" butonu çalışıyor (verimli batch update)

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

- [x] FriendsLayout component (GuildSidebar + FriendsSidebar + Content) ✅
- [x] FriendsSidebar component (Online/All/Pending tabs, friend list) ✅
- [x] FriendsHome component (welcome screen + online friends grid) ✅
- [x] AddFriendModal (username ile ekleme) ✅
- [x] Online status indicator (friend list) ✅
- [x] Redux slice ve API client (mock data ile, backend hazır olunca değiştirilecek) ✅
- [x] DM item hover effects ✅
- [ ] DMChannelList (DM listesi, son mesaj önizlemesi) - Backend hazır olunca
- [ ] DMChannel route (/dm/:channelId) - Backend hazır olunca
- [ ] Accept/decline friend request butonları - Backend hazır olunca (UI hazır)

### 📝 Backend Integration TODO'lar

**Friends API (Backend hazır olunca):**

- [ ] Replace mock data with real API calls in `frontend/src/lib/api/friends.ts`
- [ ] Replace mock data with real API calls in `frontend/src/lib/api/dms.ts`
- [ ] Implement friend request accept/decline handlers
- [ ] Implement DM navigation handlers

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
  - ✅ Frontend `.env` dosyası: `VITE_API_BASE_URL` **mutlaka `/api` prefix'i içermeli** (örn: `http://localhost:5049/api`)
  - ✅ Frontend `.env` dosyası: `VITE_SIGNALR_BASE_URL` (opsiyonel, default: `VITE_API_BASE_URL`'den `/api` kaldırılır)
  - ⚠️ **Önemli**: `VITE_API_BASE_URL` `/api` olmadan gelirse REST API çağrıları 404 hatası verir
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
4. **Faz 5** ✅ Frontend Guild & Channel UI
5. **Faz 5.3** ✅ Voice Channel UI Infrastructure
6. **Faz 6** ✅ Frontend Messaging & SignalR Integration
7. **Faz 5.5** ✅ Guild Invites
8. **Faz 5.7** ✅ Announcement Channels
9. **Faz 6.5** ✅ Mentions & Notifications
10. **Faz 7-8** 🟡 **SONRAKİ ADIM** → File upload, voice channels (WebRTC)
11. **Faz 9-9.5** → Permissions + DMs + Friends
12. **Faz 10-11** → Testing, audit log, notifications, security
13. **Faz 12** → Production deployment

---

## 🚀 SONRAKİ ADIM: FAZ 7

**Hemen yapılacaklar:**

### FAZ 7: File Upload & Video Support

1. MinIO Docker container (veya Azure Blob)
2. StorageService: Upload, Delete, Presigned URL
3. POST /api/upload endpoint (multipart, validation: boyut, tip, süre)
4. Message.Attachments JSON yapısı (url, type, size, name, duration)
5. Frontend FileUploadButton component
6. Upload API client (FormData, progress bar)
7. VideoAttachment component (inline player)
8. ImageAttachment component (thumbnail + lightbox)
9. Composer'a upload butonu entegrasyonu
10. Preview ve limit uyarıları

**Tahmini süre**: ~1 hafta  
**Test edilebilir**: Dosya yükleme, video/resim görüntüleme çalışacak

---

## 📊 ÖZELLIK ÖZETİ

| Özellik                    | Faz | Zorluk    | Frontend Bağımlılığı | Öncelik    |
| -------------------------- | --- | --------- | -------------------- | ---------- |
| Reactions                  | 3.5 | Kolay     | Hayır                | ⭐⭐⭐⭐⭐ |
| Pinned Messages            | 3.5 | Çok Kolay | Hayır                | ⭐⭐⭐⭐   |
| Unread Messages            | 3.5 | Kolay     | Hayır                | ⭐⭐⭐⭐⭐ |
| User Status                | 3.5 | Çok Kolay | Hayır                | ⭐⭐⭐     |
| Voice Channel UI (UI Only) | 5.3 | Orta      | Evet (Guild UI)      | ⭐⭐⭐⭐⭐ |
| Guild Invites              | 5.5 | Orta      | Evet (Guild UI)      | ⭐⭐⭐⭐   |
| Mentions                   | 6.5 | Orta      | Evet (Message UI)    | ⭐⭐⭐⭐   |
| DMs                        | 9.5 | Orta      | Evet (Permissions)   | ⭐⭐⭐⭐   |
| Friends                    | 9.5 | Orta      | Evet (Permissions)   | ⭐⭐⭐     |
| Audit Log                  | 10  | Kolay     | Hayır                | ⭐⭐⭐     |
| Notification Settings      | 11  | Orta      | Evet (Full UI)       | ⭐⭐⭐     |

---
