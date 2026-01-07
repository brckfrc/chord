# Chord Database ER Diagram

> **Purpose:** Visual representation of the Chord database schema and entity relationships.

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        Guid Id PK
        string Username UK
        string Email UK
        string PasswordHash
        string DisplayName
        string AvatarUrl
        DateTime CreatedAt
        DateTime UpdatedAt
        DateTime LastSeenAt
        UserStatus Status
        string CustomStatus
        string RefreshToken
        DateTime RefreshTokenExpiresAt
    }
    
    Guild {
        Guid Id PK
        string Name
        string Description
        string IconUrl
        Guid OwnerId FK
        DateTime CreatedAt
        DateTime UpdatedAt
    }
    
    GuildMember {
        Guid GuildId PK,FK
        Guid UserId PK,FK
        DateTime JoinedAt
        string Nickname
    }
    
    Channel {
        Guid Id PK
        Guid GuildId FK
        string Name
        ChannelType Type
        string Topic
        int Position
        DateTime CreatedAt
    }
    
    Message {
        Guid Id PK
        Guid ChannelId FK
        Guid AuthorId FK
        string Content
        string Attachments
        DateTime CreatedAt
        DateTime UpdatedAt
        DateTime DeletedAt
        bool IsEdited
        bool IsPinned
        DateTime PinnedAt
        Guid PinnedByUserId FK
    }
    
    MessageReaction {
        Guid Id PK
        Guid MessageId FK
        Guid UserId FK
        string Emoji
        DateTime CreatedAt
    }
    
    MessageMention {
        Guid Id PK
        Guid MessageId FK
        Guid MentionedUserId FK
        bool IsRead
        DateTime CreatedAt
    }
    
    ChannelReadState {
        Guid UserId PK,FK
        Guid ChannelId PK,FK
        Guid LastReadMessageId FK
        DateTime LastReadAt
    }
    
    Role {
        Guid Id PK
        Guid GuildId FK
        string Name
        string Color
        int Position
        long Permissions
        bool IsSystemRole
        DateTime CreatedAt
    }
    
    GuildMemberRole {
        Guid GuildId PK,FK
        Guid UserId PK,FK
        Guid RoleId PK,FK
        DateTime AssignedAt
    }
    
    GuildInvite {
        Guid Id PK
        string Code UK
        Guid GuildId FK
        Guid CreatedByUserId FK
        DateTime CreatedAt
        DateTime ExpiresAt
        int MaxUses
        int Uses
        bool IsActive
    }
    
    Friendship {
        Guid Id PK
        Guid RequesterId FK
        Guid AddresseeId FK
        FriendshipStatus Status
        DateTime CreatedAt
        DateTime AcceptedAt
    }
    
    DirectMessageChannel {
        Guid Id PK
        Guid User1Id FK
        Guid User2Id FK
        DateTime CreatedAt
        DateTime LastMessageAt
    }
    
    DirectMessage {
        Guid Id PK
        Guid ChannelId FK
        Guid SenderId FK
        string Content
        DateTime CreatedAt
        DateTime EditedAt
        bool IsDeleted
    }
    
    AuditLog {
        Guid Id PK
        Guid GuildId FK
        Guid UserId FK
        AuditAction Action
        string TargetType
        Guid TargetId
        string Changes
        string IpAddress
        string UserAgent
        DateTime Timestamp
    }
    
    %% Relationships
    User ||--o{ Guild : "owns"
    User ||--o{ GuildMember : "member_of"
    User ||--o{ Message : "author"
    User ||--o{ Message : "pinned_by"
    User ||--o{ MessageReaction : "reacts"
    User ||--o{ MessageMention : "mentioned_in"
    User ||--o{ ChannelReadState : "reads"
    User ||--o{ Friendship : "requester"
    User ||--o{ Friendship : "addressee"
    User ||--o{ DirectMessageChannel : "user1"
    User ||--o{ DirectMessageChannel : "user2"
    User ||--o{ DirectMessage : "sends"
    User ||--o{ GuildInvite : "creates"
    User ||--o{ AuditLog : "performs"
    
    Guild ||--o{ GuildMember : "has_members"
    Guild ||--o{ Channel : "has_channels"
    Guild ||--o{ Role : "has_roles"
    Guild ||--o{ GuildInvite : "has_invites"
    Guild ||--o{ AuditLog : "has_logs"
    
    GuildMember ||--o{ GuildMemberRole : "has_roles"
    
    Channel ||--o{ Message : "contains"
    Channel ||--o{ ChannelReadState : "tracked_in"
    
    Message ||--o{ MessageReaction : "has_reactions"
    Message ||--o{ MessageMention : "has_mentions"
    Message ||--o{ ChannelReadState : "last_read"
    
    Role ||--o{ GuildMemberRole : "assigned_to"
    
    DirectMessageChannel ||--o{ DirectMessage : "contains"
```

## Entity Summary

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| **User** | Authentication, profile (username, email, avatar, status) | Owns Guilds, sends Messages, has Friendships |
| **Guild** | Discord-like servers (name, icon, owner) | Has Members, Channels, Roles, Invites |
| **GuildMember** | Guild membership (user, guild, nickname) | Links User to Guild, has Roles |
| **Channel** | Text/Voice/Announcement channels in guilds | Belongs to Guild, contains Messages |
| **Message** | Chat messages with attachments | Belongs to Channel, has Reactions/Mentions |
| **MessageReaction** | Emoji reactions on messages | Links User to Message |
| **MessageMention** | @mentions tracking with read status | Links User to Message |
| **ChannelReadState** | Unread message tracking | Links User to Channel |
| **Role** | Guild roles with permissions | Belongs to Guild, assigned to Members |
| **GuildMemberRole** | Member role assignments (join table) | Links GuildMember to Role |
| **GuildInvite** | Invite links | Belongs to Guild, created by User |
| **Friendship** | Friend relationships (Pending, Accepted, Blocked) | Links two Users |
| **DirectMessageChannel** | DM channels between users | Links two Users (User1Id < User2Id) |
| **DirectMessage** | DM messages with soft delete | Belongs to DirectMessageChannel |
| **AuditLog** | Audit trail for guild actions (owner-only access) | Belongs to Guild, performed by User |

## Key Constraints

- **Composite Keys:**
  - `GuildMember`: (GuildId, UserId)
  - `GuildMemberRole`: (GuildId, UserId, RoleId)
  - `ChannelReadState`: (UserId, ChannelId)

- **Unique Constraints:**
  - `User.Username` - Unique
  - `User.Email` - Unique
  - `GuildInvite.Code` - Unique (8 characters)
  - `Role.Name` - Unique within Guild
  - `Friendship` - Unique (RequesterId, AddresseeId)
  - `DirectMessageChannel` - Unique (User1Id, User2Id) where User1Id < User2Id
  - `MessageReaction` - Unique (MessageId, UserId, Emoji)
  - `MessageMention` - Unique (MessageId, MentionedUserId)

- **Cascade Delete Rules:**
  - Guild → Channels, Members, Roles, Invites, AuditLogs (Cascade)
  - Channel → Messages, ChannelReadStates (Cascade)
  - Message → Reactions, Mentions (Cascade)
  - DirectMessageChannel → DirectMessages (Cascade)
  - GuildMember → GuildMemberRoles (Cascade)
  - User → Messages, Reactions, etc. (Restrict - cannot delete user with data)

## Notes

- All timestamps use UTC (`GETUTCDATE()` default)
- Soft delete is used for Messages (`DeletedAt`) and DirectMessages (`IsDeleted`)
- `DirectMessageChannel` enforces User1Id < User2Id to ensure uniqueness
- `AuditLog.GuildId` is nullable for global actions
- `Role.Position` hierarchy: 0 = Owner, 1-998 = Custom, 999 = General
- `Channel.Position` is scoped by Type (Text/Voice/Announcement have separate position sequences)
