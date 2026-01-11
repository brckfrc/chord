# 🎯 CHORD PROJESİ - FAZ ROADMAP

> **Purpose:** Development phases, feature roadmap, and task tracking.
> This is the internal project management document.

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
- [x] Hub event dokümantasyonu (backend/README.md) ✅
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
- ✅ **WebRTC integration**: FAZ 8'de LiveKit SFU ile ses/video streaming eklendi

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
- [x] PresenceHub OnDisconnectedAsync → status preserve ediliyor (Offline'a set edilmiyor) ✅
- [x] AuthService.GetCurrentUserAsync → status değiştirme kodu kaldırıldı (sadece PresenceHub yönetiyor) ✅
- [x] Database migration → mevcut kullanıcılar Offline olarak güncellendi ✅
- [x] Members listesinde doğru online/offline durumu gösteriliyor ✅
- [x] Frontend: Offline seçeneği kaldırıldı (StatusUpdateModal ve UserSettingsModal'dan) - Invisible zaten diğerlerine offline gibi görünüyor ✅

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
- ✅ **WebRTC streaming**: FAZ 8'de LiveKit SFU ile ses/video streaming eklendi

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
  - OnDisconnectedAsync: Status preserve ediliyor (Offline'a set edilmiyor)
  - OnConnectedAsync: Sadece Offline ise Online'a set ediliyor, diğer status'ler korunuyor
  - AuthService.GetCurrentUserAsync: Status değiştirmiyor (sadece PresenceHub yönetiyor)
  - Frontend: Offline seçeneği kaldırıldı - Invisible zaten diğerlerine offline gibi görünüyor
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
**DURUM**: ✅ %100 TAMAMLANDI

### Backend

- [x] MinIO Docker container (docker-compose.dev.yml ve docker-compose.prod.yml) ✅
- [x] StorageService: Upload, Delete, Presigned URL (IStorageService + StorageService) ✅
- [x] POST /api/upload endpoint (UploadController, multipart, validation: 25MB boyut, MIME tip) ✅
- [x] DELETE /api/upload endpoint (dosya silme) ✅
- [x] Message.Attachments JSON yapısı (url, type, size, name, duration) ✅
- [x] UploadResponseDto ve AttachmentDto DTOs ✅
- [x] Minio NuGet package (6.0.3) ✅
- [x] Program.cs'e IStorageService DI registration ve MinIO config ✅

### Frontend

- [x] FileUploadButton component (drag-drop, file selection, preview, progress bar) ✅
- [x] Upload API client (upload.ts, FormData, progress tracking) ✅
- [x] VideoAttachment component (HTML5 player, controls, duration display) ✅
- [x] ImageAttachment component (thumbnail, lightbox, lazy loading) ✅
- [x] DocumentAttachment component (file icon, name, size, download) ✅
- [x] MessageComposer'a upload butonu entegrasyonu ✅
- [x] MessageItem'a attachment rendering ✅
- [x] File validation utilities (boyut, tip kontrolleri) ✅

### Ek İyileştirmeler

- [x] MessageItem floating action bar (Discord-like, sağ üst köşe) ✅
- [x] DocumentAttachment doğrudan indirme (fetch + blob, yönlendirmesiz) ✅
- [x] ProtectedRoute F5 refresh fix (sayfa yenilemede mevcut sayfada kalma) ✅

### Deliverables

✅ Dosya yükleme çalışıyor (25MB limit)  
✅ Video inline oynatılıyor (HTML5 player, controls)  
✅ Resim thumbnail + lightbox  
✅ Document dosyaları görüntüleme ve indirme  
✅ Boyut/tip limitleri kontrol ediliyor  
✅ Drag-drop ve progress bar çalışıyor

### 📝 Notlar

**Docker MinIO Yapılandırması:**

- Image: `minio/minio:latest`
- Portlar: 9000 (API), 9001 (Console)
- Network: `chord-network`
- Volume: `minio_data` (persistent)
- Health check aktif
- Console erişim: http://localhost:9001 (minioadmin/minioadmin)

**Dosya Limitleri:**

| Tip      | Max Boyut | Desteklenen Formatlar               |
| -------- | --------- | ----------------------------------- |
| Image    | 25MB      | jpg, png, gif, webp                 |
| Video    | 25MB      | mp4, webm, quicktime                |
| Document | 25MB      | pdf, docx, xlsx, txt, csv, zip, rar |

**Başlatma Komutları:**

```bash
# Development - altyapıyı başlat
cd backend
docker compose -f docker-compose.dev.yml up -d

# API'yi ayrı çalıştır
dotnet run
```

---

## ✅ FAZ 8: VOICE CHANNELS & WEBRTC - %100 TAMAMLANDI

**Süre**: ~2 hafta  
**DURUM**: ✅ %100 TAMAMLANDI  
**Not**: Orijinal planda P2P mesh planlanmıştı, ancak ölçeklenebilirlik için **LiveKit SFU** mimarisine geçildi.

### Backend - Docker & Infrastructure

- [x] LiveKit SFU server (Docker container)
- [x] Coturn STUN/TURN server (Docker container)
- [x] Environment-based port binding (esnek deployment)
- [x] livekit.yaml.template ve turnserver.conf.template config dosyaları
- [x] docker-compose.standalone.yml (Caddy ile opsiyonel)
- [x] setup-env.sh comprehensive setup script (dev + prod modes)
- [x] update-ip.sh quick IP change script (for mobile developers)

### Backend - API & Services

- [x] IVoiceService + VoiceService (LiveKit token generation)
- [x] VoiceController (POST /api/voice/token)
- [x] VoiceTokenDto, VoiceJoinResponseDto DTOs
- [x] ChatHub.JoinVoiceChannel → LiveKit token döner
- [x] Program.cs LiveKit configuration + DI
- [x] Livekit.Server.Sdk.Dotnet NuGet paketi

### Frontend - LiveKit Integration

- [x] livekit-client + @livekit/components-react NPM paketleri
- [x] useLiveKit hook (connect, disconnect, mute, video)
- [x] voiceSlice Redux state (LiveKit connection, participants, speaking)
- [x] VoiceRoom component (LiveKitRoom wrapper)
- [x] ParticipantTile component (avatar, speaking indicator, video)
- [x] MediaControls component (mute/deafen/camera/disconnect)
- [x] AudioRenderer + VideoRenderer components
- [x] VoiceBar speaking indicator + controls
- [x] VoiceChannelUsers speaking animation (yeşil halka)

### Error Handling

- [x] Mikrofon izni reddedildi → UI feedback + retry
- [x] Bağlantı hatası → Otomatik retry (3x, exponential backoff)
- [x] Room full handling → Error mesajı
- [x] Network kesintisi → Reconnect logic

### Deployment

- [x] docker-compose.dev.yml (development)
- [x] docker-compose.prod.yml (production, behind proxy)
- [x] docker-compose.standalone.yml (Caddy ile tek başına)
- [x] Caddyfile.template reverse proxy config
- [x] setup-env.sh interactive setup script (dev/prod modes, auto-secrets, LAN IP detection)
- [x] update-ip.sh network change utility (quick IP update without full setup)
- [x] start-dev.sh / stop.sh generated helper scripts

### Deliverables

✅ LiveKit SFU ile sesli kanala katılma çalışıyor  
✅ SFU mimarisi ile 10+ kullanıcı destekli ses/video  
✅ Mute/unmute/camera toggle çalışıyor  
✅ Speaking indicator (yeşil halka) çalışıyor  
✅ Coturn STUN/TURN ile NAT geçişi  
✅ Plug-and-play deployment (setup.sh)  
✅ Environment-based esnek port yönetimi

### 📝 Notlar

**Mimari Değişiklik:**  
Orijinal plan WebRTC P2P mesh kullanıyordu (max 5 kişi). Ölçeklenebilirlik için **LiveKit SFU** mimarisine geçildi:

- 10+ kullanıcı desteği
- Daha düşük client-side bandwidth
- Merkezi media routing
- Built-in TURN entegrasyonu

**Docker Services:**

| Service | Port       | Açıklama                       |
| ------- | ---------- | ------------------------------ |
| LiveKit | 7880, 7881 | WebSocket signaling, RTC media |
| Coturn  | 3478       | STUN/TURN NAT traversal        |

**Environment Variables (setup-env.sh tarafından otomatik oluşturulur):**

```env
# Network
HOST=192.168.1.x          # Auto-detected LAN IP
LAN_IP=192.168.1.x        # Same as HOST for dev

# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<auto-generated>
LIVEKIT_URL=ws://192.168.1.x:7880
LIVEKIT_NODE_IP=192.168.1.x

# TURN
TURN_SECRET=<auto-generated>
TURN_REALM=chord.local
```

**Setup Scripts:**

```bash
./setup-env.sh dev    # Full setup for development (with LAN access)
./setup-env.sh prod   # Full setup for production (with domain)
./update-ip.sh        # Quick IP update when changing networks
./start-dev.sh        # Start all services (generated by setup)
./stop.sh             # Stop all services (generated by setup)
```

---

## 🏗️ FAZ 9: PERMISSIONS & ROLES

**Süre**: ~3-4 gün  
**DURUM**: ✅ %100 TAMAMLANDI

### Backend Görevler

- [x] GuildPermission enum (bitfield - 19 permission flags)
- [x] Role entity (Id, GuildId, Name, Color, Position, Permissions, IsSystemRole)
- [x] GuildMemberRole join entity (many-to-many)
- [x] Migration: AddRolesSystem (create tables, seed owner/general roles)
- [x] IPermissionService: GetUserPermissions, HasPermission, IsOwner, CanManageRole
- [x] IRoleService: CRUD, reorder, assign/remove roles
- [x] RolesController: Full API for role management
- [x] Integration with GuildService, ChannelService, MessageService

### Frontend Görevler

- [x] GuildPermission enum (frontend mirror)
- [x] rolesSlice: Redux state management
- [x] usePermission hook: Easy permission checking
- [x] RoleManagement component: Role CRUD with drag-drop reorder
- [x] MemberRolesTab component: Assign roles to members
- [x] GuildSettingsModal: Tabbed settings (Overview, Roles, Members)
- [x] Permission-based UI (create channel, delete message, etc.)

### Deliverables

✅ Bitfield-based permission system (19 permissions)  
✅ System roles: owner (position 0), general (position 999)  
✅ Custom roles with colors and drag-drop reordering  
✅ Role hierarchy enforcement  
✅ Frontend permission hooks and UI integration  
✅ Guild Settings modal with tabs

---

## 🏗️ FAZ 9.5: DIRECT MESSAGES & FRIENDS ⭐ YENİ

**Süre**: ~3-4 gün  
**DURUM**: ✅ %100 TAMAMLANDI  
**Neden bu aşamada**: Permissions hazır, private messaging için rol sistemi gerekli

### Backend Görevler

#### 1. Friend System

- [x] Friendship entity (Id, RequesterId, AddresseeId, Status, CreatedAt, AcceptedAt) ✅
- [x] FriendshipStatus enum (Pending, Accepted, Blocked) ✅
- [x] Unique index: (RequesterId, AddresseeId) ✅
- [x] API: POST /friends/request ✅
- [x] POST /friends/{id}/accept, /decline, /block ✅
- [x] DELETE /friends/{id} (unfriend) ✅
- [x] GET /friends, /friends/pending, /friends/blocked ✅
- [x] Migration: CreateFriendshipsTable ✅
- [x] IFriendshipService + FriendshipService implementation ✅
- [x] FriendsController (9 endpoints) ✅

#### 2. Direct Messages

- [x] DirectMessageChannel entity (Id, User1Id, User2Id) ✅
- [x] DirectMessage entity (Id, ChannelId, SenderId, Content, soft delete) ✅
- [x] Unique index: (User1Id, User2Id) where User1Id < User2Id ✅
- [x] API: POST /dms/{userId} (create/get DM channel) ✅
- [x] GET /dms (list all DM channels) ✅
- [x] GET /dms/{dmId}/messages (paginated) ✅
- [x] POST /dms/{dmId}/messages (send DM) ✅
- [x] PUT/DELETE /dms/{dmId}/messages/{id} (edit/delete) ✅
- [x] POST /dms/{dmId}/mark-read (unread tracking) ✅
- [x] Block check: Blocked users can't send DMs ✅
- [x] ChatHub: DM SignalR events (JoinDM, SendDMMessage, TypingInDM, MarkDMAsRead) ✅
- [x] Migration: CreateDirectMessagesAndFriendshipsTable ✅
- [x] IDMChannelService + DMChannelService ✅
- [x] IDirectMessageService + DirectMessageService ✅
- [x] DMController (7 endpoints) ✅

### Frontend Görevler

- [x] FriendsLayout component (GuildSidebar + FriendsSidebar + Content) ✅
- [x] FriendsSidebar component (Online/All/Pending tabs, friend list, DM list) ✅
- [x] FriendsHome component (welcome screen + online friends grid) ✅
- [x] AddFriendModal (username ile ekleme) ✅
- [x] Online status indicator (friend list) ✅
- [x] Redux slices: friendsSlice, dmsSlice ✅
- [x] API clients: friends.ts, dms.ts (full integration) ✅
- [x] DM item hover effects ✅
- [x] DMView component (DM conversation UI) ✅
- [x] DMChannel route (/me/dm/:dmId) ✅
- [x] Accept/decline friend request handlers ✅
- [x] Username display (displayName → username globally) ✅
- [x] Toast notifications (friend actions) ✅

### Deliverables

✅ Arkadaş ekleme/kabul etme/reddetme çalışıyor  
✅ Arkadaş engelleme/kaldırma çalışıyor  
✅ DM channel oluşturma/listeleme çalışıyor  
✅ DM mesajlaşma (send, edit, delete) çalışıyor  
✅ DM unread tracking çalışıyor  
✅ Block check: Blocked users can't DM ✅  
✅ SignalR real-time DM events çalışıyor  
✅ Frontend tam entegre (API + UI)  
✅ Username görünümü uygulandı (guild'lerde nickname priority)

---

## 🏗️ FAZ 10: TESTING & OBSERVABILITY

**Süre**: ~4-5 gün (Audit Log eklendi)  
**DURUM**: 🟡 Kısmen Tamamlandı (Backend ✅, Frontend ✅)

### Görevler

#### Mevcut Testler

- [x] xUnit testlerini düzelt ve genişlet ✅
- [x] Unit test coverage artırma (≥70% hedef) ✅
  - AuthService ✅ (15 test case, %100 coverage)
  - GuildService ✅ (21 test case, ~95% coverage)
  - ChannelService ✅ (14 test case, ~80% coverage)
  - MessageService ✅ (17 test case, ~75% coverage)
- [ ] Integration testler (WebApplicationFactory)
- [ ] OpenTelemetry kurulumu (traces, metrics)
- [x] Health checks genişletme (Redis, MinIO) ✅

#### ⭐ Audit Log (Backend Tamamlandı)

**Backend:**

- [x] AuditLog entity (Id, GuildId, UserId, Action, TargetType, TargetId, Changes, IpAddress, Timestamp) ✅
- [x] AuditAction enum (MemberJoin, MemberKick, ChannelCreate, MessageDelete, RoleUpdate, etc.) ✅
- [x] Middleware: AuditLogMiddleware (önemli işlemleri logla) ✅
- [x] IAuditLogService + AuditLogService implementation ✅
- [x] AuditLogsController: GET /guilds/{id}/audit-logs (owner only, pagination) ✅
- [x] Migration: CreateAuditLogsTable ✅
- [x] Integration with services (logging important actions) ✅

**Frontend:**

- [ ] AuditLogPanel component (guild settings)
- [ ] API client: auditLogs.ts
- [ ] Redux slice: auditLogsSlice
- [ ] Display in GuildSettingsModal (new "Audit Log" tab)

### Frontend (Mevcut)

- [ ] Component testleri (kritik flow'lar)
- [ ] E2E testler (Playwright veya Cypress): Login → Guild → Mesaj gönder
- [ ] Performance profiling

### Deliverables

✅ Audit log backend tamamlandı (API endpoint, service, middleware)  
✅ Audit log frontend UI tamamlandı (guild settings panel, pagination)  
✅ Health checks genişletildi (Redis, MinIO)  
✅ UTC timestamp handling utility (merkezi dateUtils.ts)  
✅ xUnit testler tamamlandı (88 test case, tüm testler geçiyor)  
✅ Test coverage ≥70% (core services: AuthService %100, GuildService ~95%, ChannelService ~80%, MessageService ~75%)  
✅ Coverage raporu oluşturuldu (Coverlet, XML format: `ChordAPI.Tests/TestResults/*/coverage.cobertura.xml`)  
✅ E2E testler ana akışı kapsıyor (Playwright, Docker Compose test environment, Login → Guild → Message flow)  
⏳ Metrik/trace dashboard görünür

### 📝 Test Notları

**xUnit Test Projesi (ChordAPI.Tests):**

- ✅ Proje oluşturuldu (FAZ 1'de)
- ✅ Test infrastructure hazır (InMemory DB, Moq, xUnit)
- ✅ Tüm testler düzeltildi ve genişletildi (88 test case)
- ✅ IAuditLogService mock'ları eklendi (GuildService, ChannelService, MessageService)
- ✅ Error handling testleri eklendi (KeyNotFoundException, UnauthorizedAccessException)
- ✅ Edge case testleri eklendi (position shifting, mention extraction, soft delete)
- ✅ Coverage ≥70% hedefi karşılandı (core services)
- 📦 Test Packages: xUnit 2.9.2, Moq 4.20.72, EF Core InMemory 9.0.0
- 📊 Coverage Tool: Coverlet (XML rapor: `ChordAPI.Tests/TestResults/*/coverage.cobertura.xml`)
- 🎯 Test Coverage: AuthService %100, GuildService ~95%, ChannelService ~80%, MessageService ~75%

---

## 🏗️ FAZ 11: PERFORMANCE & SECURITY

**Süre**: ~4-5 gün (Notification Settings eklendi)  
**DURUM**: 🟡 Kısmen Tamamlandı (Load Testing ✅)

### Görevler (Mevcut)

- [x] Load testing (K6 veya Locust): 1K eşzamanlı bağlantı ✅ ⚠️ Push sonrası server-side test edilmeli (chord-network üzerinden)
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
**DURUM**: 🟡 Büyük oranda tamamlandı (8/10 görev)

### Görevler

#### Tamamlananlar

- [x] Production Dockerfile (backend + frontend) ✅
- [x] Docker Compose production config ✅
  - ✅ `docker-compose.standalone.yml` (Caddy + blue-green)
  - ✅ `docker-compose.deploy.yml` (Standard VPS + blue-green)
  - ✅ `docker-compose.yunohost.yml` (YunoHost overrides)
- [x] GitHub Actions CI/CD ✅
  - ✅ Build → Test → Push to GHCR → Deploy to VPS
  - ✅ Blue-green deployment strategy
  - ✅ Health checks
  - ✅ Automatic rollback on failure
- [x] Deployment scripts ✅
  - ✅ `scripts/deploy.sh` (blue-green automation)
  - ✅ `scripts/rollback.sh`
  - ✅ `scripts/setup-infra.sh`
- [x] Environment variables yönetimi ✅
  - ✅ `setup-env.sh` ile otomatik environment yönetimi
  - ✅ Template-based config generation (.env, livekit.yaml, turnserver.conf)
  - ✅ Secret auto-generation (SQL, JWT, MinIO, LiveKit, TURN)
  - ✅ LAN IP detection for network access
  - ✅ Frontend `.env`: `VITE_API_BASE_URL` **mutlaka `/api` prefix'i içermeli**
  - ✅ Frontend `.env`: `VITE_SIGNALR_BASE_URL` (gerekli)
  - ✅ `update-ip.sh` ile hızlı IP değişikliği (ağ değişimlerinde)
- [x] API dokümantasyonu ✅
  - ✅ Swagger UI active (http://localhost:5049/swagger)
  - ✅ Comprehensive backend/README.md
- [x] Deployment documentation ✅
  - ✅ `docs/DEPLOYMENT.md` (decision tree + overview)
  - ✅ `docs/DEPLOYMENT-STANDALONE.md` (fresh server + Caddy)
  - ✅ `docs/DEPLOYMENT-STANDARD.md` (existing reverse proxy)
  - ✅ `docs/DEPLOYMENT-YUNOHOST.md` (YunoHost integration)

#### Kalan Görevler

- [x] ER diagram güncelliği kontrol ✅
  - ✅ `docs/ER_DIAGRAM.md` oluşturuldu (Mermaid ER diagram)
  - ✅ Tüm entity'ler ve ilişkileri eklendi
  - ✅ Backend README'ye AuditLog eklendi
  - ✅ Backend README'ye ER diagram referansı eklendi
- [x] Postman collection güncelliği kontrol ✅
  - ✅ Audit Logs endpoint eklendi (GET /api/guilds/{guildId}/audit-logs)
  - ✅ Friends endpoints eklendi (9 endpoint: request, accept, decline, block, unblock, list, etc.)
  - ✅ DMs endpoints eklendi (7 endpoint: list, create, get messages, send, edit, delete)
  - ✅ Collection variables eklendi (guildId, userId, dmId, friendId, friendshipId, messageId)
  - ✅ All endpoints added (Audit Logs, Friends, DMs)
  - ✅ Collection variables added for easier testing
- [ ] Demo senaryosu hazırlama
- [ ] Video demo kaydı

### Deliverables

✅ Docker Compose production configs (3 scenarios)  
✅ GitHub Actions CI/CD pipeline aktif  
✅ Blue-green deployment with automatic rollback  
✅ Comprehensive deployment documentation (4 guides)  
✅ API documentation (Swagger + backend/README.md)  
✅ ER diagram güncelliği (Mermaid diagram + entity list)  
⏳ Postman collection güncelliği  
⏳ Demo videosu hazır

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
10. **Faz 7** ✅ File Upload & Video Support
11. **Faz 8** ✅ Voice Channels (WebRTC + LiveKit)
12. **Faz 9** ✅ Permissions & Roles + Guild Settings + Profile Photos
13. **Faz 9.5** ✅ DMs + Friends
14. **Faz 10** 🟡 Testing + Audit Log (Backend ✅, Frontend ✅)
15. **Faz 12** 🟡 **ŞU AN** → Deployment & Documentation (8/10 ✅)
16. **Faz 11** → Security + Notification Settings

---

## 🚀 ŞU ANKİ DURUM: FAZ 12 (8/10 ✅)

**Kalan görevler:**

### FAZ 12: Deployment & Documentation - Finalize

1. **ER Diagram Güncelliği**
   - Mevcut schema'yı yansıtıyor mu kontrol et
   - Yeni entity'ler: AuditLog, Friendship, DirectMessage, DirectMessageChannel
2. **Postman Collection Güncelliği**
   - `ChordAPI.postman_collection.json` dosyasını kontrol et
   - Yeni endpoint'ler: Audit Logs, Friends, DMs
3. **Demo Senaryosu**
   - Kullanıcı hikayesi yazılımı (login → guild → message → voice → DM)
4. **Video Demo**
   - Özellik showcase videosu

**Tahmini süre**: ~1-2 gün  
**Test edilebilir**: Demo akışı çalıştığından emin ol

---

## 🔄 ALTERNATIF SONRAKI ADIM: FAZ 10 - Frontend

**Audit Log frontend UI:**

1. **Frontend components**:
   - AuditLogPanel component (guild settings)
   - API client: `auditLogs.ts`
   - Redux slice: `auditLogsSlice`
   - GuildSettingsModal'a "Audit Log" tab'ı ekle
2. **Unit testler** düzelt ve genişlet (AuthService, GuildService, ChannelService)
3. **Integration testler** (WebApplicationFactory)
4. **OpenTelemetry** kurulumu (traces, metrics)

**Tahmini süre**: ~2-3 gün

---

## ✅ SON TAMAMLANAN

### FAZ 9.5: Direct Messages & Friends ✅

**Friend System:**

- Friendship entity (RequesterId, AddresseeId, Status)
- FriendshipStatus enum (Pending, Accepted, Blocked)
- FriendsController: 9 endpoints (send, accept, decline, block, unfriend, list)
- IFriendshipService + FriendshipService (business logic)

**Direct Messages:**

- DirectMessageChannel entity (User1Id, User2Id)
- DirectMessage entity (content, soft delete)
- DMController: 7 endpoints (create/get DM, list DMs, send/edit/delete messages, mark read)
- IDMChannelService + IDirectMessageService
- Block check: Blocked users cannot send DMs
- Unread tracking per DM channel

**SignalR Events:**

- JoinDM, LeaveDM
- SendDMMessage, TypingInDM, StopTypingInDM, MarkDMAsRead
- Server → Client: DMReceiveMessage, DMMessageEdited, DMMessageDeleted, DMUserTyping, DMUserStoppedTyping, DMMarkAsRead

**Frontend:**

- FriendsHome: Online/All/Pending tabs
- FriendsSidebar: Friends + DM list
- DMView: Full conversation UI
- Accept/decline friend requests with toast notifications
- Username display globally (displayName replaced)
- Redux: friendsSlice, dmsSlice
- API clients: Full backend integration

### FAZ 10: Audit Logs Backend ✅

**Backend Implementation:**

- AuditLog entity with full tracking (User, Action, Target, Changes, IP, Timestamp)
- AuditAction enum (19 action types)
- AuditLogService + IAuditLogService
- AuditLogsController with pagination (50 logs/page, max 100)
- AuditLogMiddleware for automatic logging
- Owner-only access control
- Migration: CreateAuditLogsTable

### FAZ 12: Deployment & Documentation (8/10) 🟡

**Completed:**

- Docker Compose configs (3 deployment scenarios)
- GitHub Actions CI/CD with blue-green deployment
- Deployment scripts (deploy.sh, rollback.sh, setup-infra.sh)
- Comprehensive deployment guides (4 documents)
- Environment management automation
- API documentation (Swagger + backend/README.md)
- ER diagram (Mermaid) with all entities and relationships

---

## 📊 ÖZELLIK ÖZETİ

| Özellik                    | Faz | Zorluk    | Frontend Bağımlılığı | Durum                |
| -------------------------- | --- | --------- | -------------------- | -------------------- |
| Reactions                  | 3.5 | Kolay     | Hayır                | ✅                   |
| Pinned Messages            | 3.5 | Çok Kolay | Hayır                | ✅                   |
| Unread Messages            | 3.5 | Kolay     | Hayır                | ✅                   |
| User Status                | 3.5 | Çok Kolay | Hayır                | ✅                   |
| Voice Channel UI (UI Only) | 5.3 | Orta      | Evet (Guild UI)      | ✅                   |
| Guild Invites              | 5.5 | Orta      | Evet (Guild UI)      | ✅                   |
| Mentions                   | 6.5 | Orta      | Evet (Message UI)    | ✅                   |
| File Upload                | 7   | Orta      | Evet (Message UI)    | ✅                   |
| Voice/Video (WebRTC)       | 8   | Zor       | Evet (LiveKit)       | ✅                   |
| Permissions & Roles        | 9   | Orta      | Evet (Guild UI)      | ✅                   |
| Guild Settings Modal       | 9   | Kolay     | Evet (Permissions)   | ✅                   |
| Profile Photos             | 9   | Kolay     | Evet (MinIO)         | ✅                   |
| DMs                        | 9.5 | Orta      | Evet (Permissions)   | ✅                   |
| Friends                    | 9.5 | Orta      | Evet (Permissions)   | ✅                   |
| Username Display Fix       | 9.5 | Çok Kolay | Evet (Full UI)       | ✅                   |
| Audit Log (Backend)        | 10  | Kolay     | Hayır                | ✅                   |
| Audit Log (Frontend)       | 10  | Kolay     | Evet (Guild UI)      | ✅                   |
| Deployment & CI/CD         | 12  | Orta      | Hayır                | 🟡 (7/10 tamamlandı) |
| Notification Settings      | 11  | Orta      | Evet (Full UI)       | ⏳                   |

---
