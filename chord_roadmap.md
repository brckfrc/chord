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

## 🏗️ FAZ 4: FRONTEND FOUNDATION & AUTH UI

**Süre**: ~1 hafta

### Görevler

- [ ] Vite + React + TypeScript kurulumu
- [ ] Paketler: Redux Toolkit, React Router, Axios, SignalR Client, Tailwind, React Hook Form, Zod
- [ ] Redux store setup (authSlice, guildsSlice, channelsSlice, messagesSlice, presenceSlice)
- [ ] Axios instance: Base URL, JWT interceptor, 401 refresh token handler
- [ ] Auth API layer: register, login, refresh, getCurrentUser
- [ ] Login/Register sayfaları (form validation)
- [ ] ProtectedRoute component
- [ ] Token localStorage yönetimi
- [ ] Router setup (/, /login, /register, /channels/:guildId/:channelId)
- [ ] Tailwind konfigürasyonu
- [ ] Base UI components: Button, Input, Spinner, Toast

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

## 🏗️ FAZ 7: FILE UPLOAD & VIDEO SUPPORT

**Süre**: ~1 hafta

### Backend

- [ ] MinIO Docker container (veya Azure Blob)
- [ ] StorageService: Upload, Delete, Presigned URL
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

## 🏗️ FAZ 10: TESTING & OBSERVABILITY

**Süre**: ~3-4 gün

### Backend

- [ ] xUnit testlerini düzelt ve genişlet (AuthService testleri hazır ama çalışmıyor)
- [ ] Unit test coverage artırma (≥70% hedef)
  - AuthService ✅ (13 test case hazır, düzeltilecek)
  - GuildService testleri
  - ChannelService testleri
  - MessageService testleri
- [ ] Integration testler (WebApplicationFactory)
- [ ] OpenTelemetry kurulumu (traces, metrics)
- [ ] Health checks genişletme (Redis, MinIO)

### Frontend

- [ ] Component testleri (kritik flow'lar)
- [ ] E2E testler (Playwright veya Cypress): Login → Guild → Mesaj gönder
- [ ] Performance profiling

### Deliverables

✅ Test coverage ≥60%  
✅ E2E testler ana akışı kapsıyor  
✅ Metrik/trace dashboard görünür

### 📝 Test Notları

**xUnit Test Projesi (ChordAPI.Tests):**

- ✅ Proje oluşturuldu (FAZ 1'de)
- ✅ Test infrastructure hazır (InMemory DB, Moq, xUnit)
- ⚠️ AuthService için 13 test case yazıldı ama method signature hatası var
- ⏳ FAZ 10'da tüm testler düzeltilip genişletilecek
- 📦 Test Packages: xUnit 2.9.2, Moq 4.20.72, EF Core InMemory 9.0.0

---

## 🏗️ FAZ 11: PERFORMANCE & SECURITY

**Süre**: ~3-4 gün

### Görevler

- [ ] Load testing (K6 veya Locust): 1K eşzamanlı bağlantı
- [ ] Rate limiting iyileştirme (Redis-based distributed)
- [ ] Input validation sertleştirme
- [ ] CORS politikası güncelleme (production domain)
- [ ] TLS/HTTPS yapılandırması (Let's Encrypt)
- [ ] SQL injection/XSS kontrolleri
- [ ] Sensitive data masking (logs)
- [ ] Password policy enforcement

### Deliverables

✅ 1K bağlantıda kabul edilebilir gecikme  
✅ Güvenlik best practices uygulanmış  
✅ Production-ready TLS

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

## 🎯 ÖNCELİK SIRASI

1. **İlk 4 Faz** → Core functionality (auth, messaging, UI)
2. **Faz 5-7** → Advanced features (voice, files)
3. **Faz 8-10** → Polish (permissions, testing, security)
4. **Faz 11** → Production deployment

## 🚀 ŞİMDİ BAŞLAYALIM

**Faz 1** için gereken ilk adımlar:

1. Backend klasör yapısı oluştur
2. Docker Compose hazırla
3. NuGet paketlerini yükle
4. AppDbContext + User entity
5. Auth endpoints

**Agent mode'a geçmeye hazır mısın?** Backend iskeletini hızlıca kurabiliriz 🎯
