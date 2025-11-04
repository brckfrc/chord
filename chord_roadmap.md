# 🎯 CHORD PROJESİ - FAZ ROADMAP

## 📋 Temel Yapı
- **Repo**: Monorepo (backend + frontend)
- **iOS**: Ayrı repo (sonraki faz)
- **Deployment**: Docker → Kendi sunucu/domain
- **Veritabanı**: SQL Server + Redis (Docker)

---

## 🏗️ FAZ 1: BACKEND FOUNDATION & AUTH
**Süre**: ~1-1.5 hafta

### Görevler
- [ ] Proje iskeleti oluştur (dotnet new webapi, klasör yapısı)
- [ ] Docker Compose (SQL Server + Redis)
- [ ] NuGet paketleri (EF Core, JWT, BCrypt, SignalR Redis, FluentValidation, AutoMapper, Serilog)
- [ ] AppDbContext + User entity
- [ ] AuthService: Register, Login, Refresh Token (JWT + BCrypt)
- [ ] Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- [ ] Middleware: Global error handler, CORS, Rate limiting
- [ ] Serilog yapılandırması
- [ ] Health check endpoint
- [ ] Postman collection
- [ ] xUnit test projesi (AuthService testleri)

### Deliverables
✅ Kullanıcı kaydolup giriş yapabiliyor  
✅ JWT token alıp korumalı endpoint'e erişebiliyor  
✅ Docker Compose ile DB ayakta  

---

## 🏗️ FAZ 2: GUILD & CHANNEL DOMAIN
**Süre**: ~1 hafta

### Görevler
- [ ] Entities: Guild, GuildMember, Channel, ChannelPermission
- [ ] Migration: Guild-Channel ilişkileri
- [ ] DTOs: Guild, Channel için Create/Update/Response DTOs
- [ ] GuildService: CRUD, üye yönetimi (add/remove)
- [ ] ChannelService: CRUD, yetki kontrolü
- [ ] Authorization Policies: IsGuildMember, IsGuildOwner
- [ ] Endpoints: Guilds CRUD, Channels CRUD, Members yönetimi
- [ ] Unit + integration testler

### Deliverables
✅ Guild oluşturma/yönetme çalışıyor  
✅ Kanal oluşturma/yönetme çalışıyor  
✅ Üyelik kontrolü aktif  

---

## 🏗️ FAZ 3: SIGNALR & REAL-TIME MESSAGING
**Süre**: ~1.5 hafta

### Görevler
- [ ] Message entity (content, attachments JSON, soft delete)
- [ ] ChatHub: JoinChannel, SendMessage, EditMessage, DeleteMessage, Typing
- [ ] PresenceHub: Online/offline durumu, LastSeenAt
- [ ] Redis backplane konfigürasyonu
- [ ] Connection mapping service (userId ↔ connectionId)
- [ ] MessageService: CRUD, pagination
- [ ] REST endpoints (fallback): GET/POST /channels/{id}/messages
- [ ] Hub event dokümantasyonu (ReceiveMessage, MessageEdited, UserOnline vs.)
- [ ] SignalR integration testleri

### Deliverables
✅ Gerçek zamanlı mesajlaşma çalışıyor  
✅ Presence (online/offline) yayınlanıyor  
✅ Typing indicators aktif  
✅ Mesaj edit/delete çalışıyor  

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
- [ ] Unit test coverage artırma (≥70% hedef)
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