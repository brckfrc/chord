using Microsoft.EntityFrameworkCore;
using ChordAPI.Models.Entities;

namespace ChordAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Guild> Guilds { get; set; }
    public DbSet<GuildMember> GuildMembers { get; set; }
    public DbSet<GuildInvite> GuildInvites { get; set; }
    public DbSet<Channel> Channels { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<MessageReaction> MessageReactions { get; set; }
    public DbSet<MessageMention> MessageMentions { get; set; }
    public DbSet<ChannelReadState> ChannelReadStates { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<GuildMemberRole> GuildMemberRoles { get; set; }
    public DbSet<Friendship> Friendships { get; set; }
    public DbSet<DirectMessageChannel> DirectMessageChannels { get; set; }
    public DbSet<DirectMessage> DirectMessages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Guild configuration
        modelBuilder.Entity<Guild>(entity =>
        {
            entity.HasOne(g => g.Owner)
                .WithMany()
                .HasForeignKey(g => g.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // GuildMember configuration (composite key)
        modelBuilder.Entity<GuildMember>(entity =>
        {
            entity.HasKey(gm => new { gm.GuildId, gm.UserId });

            entity.HasOne(gm => gm.Guild)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GuildId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(gm => gm.User)
                .WithMany(u => u.GuildMemberships)
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.JoinedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Channel configuration
        modelBuilder.Entity<Channel>(entity =>
        {
            entity.HasOne(c => c.Guild)
                .WithMany(g => g.Channels)
                .HasForeignKey(c => c.GuildId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Message configuration
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasOne(m => m.Channel)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Author)
                .WithMany(u => u.Messages)
                .HasForeignKey(m => m.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.PinnedByUser)
                .WithMany()
                .HasForeignKey(m => m.PinnedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(m => m.ChannelId);
            entity.HasIndex(m => m.CreatedAt);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // MessageReaction configuration
        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.HasOne(mr => mr.Message)
                .WithMany()
                .HasForeignKey(mr => mr.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(mr => mr.User)
                .WithMany()
                .HasForeignKey(mr => mr.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index: A user can only react once per emoji per message
            entity.HasIndex(mr => new { mr.MessageId, mr.UserId, mr.Emoji })
                .IsUnique();

            entity.HasIndex(mr => mr.MessageId);
            entity.HasIndex(mr => mr.CreatedAt);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // MessageMention configuration
        modelBuilder.Entity<MessageMention>(entity =>
        {
            entity.HasOne(mm => mm.Message)
                .WithMany()
                .HasForeignKey(mm => mm.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(mm => mm.MentionedUser)
                .WithMany()
                .HasForeignKey(mm => mm.MentionedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index: A user can only be mentioned once per message (for IsRead tracking)
            entity.HasIndex(mm => new { mm.MessageId, mm.MentionedUserId })
                .IsUnique();

            entity.HasIndex(mm => mm.MentionedUserId);
            entity.HasIndex(mm => mm.MessageId);
            entity.HasIndex(mm => mm.CreatedAt);
            entity.HasIndex(mm => new { mm.MentionedUserId, mm.IsRead });

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // ChannelReadState configuration (composite key)
        modelBuilder.Entity<ChannelReadState>(entity =>
        {
            entity.HasKey(crs => new { crs.UserId, crs.ChannelId });

            entity.HasOne(crs => crs.User)
                .WithMany()
                .HasForeignKey(crs => crs.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(crs => crs.Channel)
                .WithMany()
                .HasForeignKey(crs => crs.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(crs => crs.LastReadMessage)
                .WithMany()
                .HasForeignKey(crs => crs.LastReadMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(crs => crs.ChannelId);
            entity.HasIndex(crs => crs.UserId);
            entity.HasIndex(crs => crs.LastReadAt);

            entity.Property(e => e.LastReadAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // GuildInvite configuration
        modelBuilder.Entity<GuildInvite>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();

            entity.HasOne(i => i.Guild)
                .WithMany()
                .HasForeignKey(i => i.GuildId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.CreatedByUser)
                .WithMany()
                .HasForeignKey(i => i.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(i => i.GuildId);
            entity.HasIndex(i => i.CreatedByUserId);
            entity.HasIndex(i => i.CreatedAt);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Role configuration
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasOne(r => r.Guild)
                .WithMany(g => g.Roles)
                .HasForeignKey(r => r.GuildId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique index: Role name must be unique within a guild
            entity.HasIndex(r => new { r.GuildId, r.Name }).IsUnique();

            entity.HasIndex(r => r.GuildId);
            entity.HasIndex(r => new { r.GuildId, r.Position });

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // GuildMemberRole configuration (composite key for many-to-many)
        modelBuilder.Entity<GuildMemberRole>(entity =>
        {
            entity.HasKey(gmr => new { gmr.GuildId, gmr.UserId, gmr.RoleId });

            entity.HasOne(gmr => gmr.GuildMember)
                .WithMany(gm => gm.MemberRoles)
                .HasForeignKey(gmr => new { gmr.GuildId, gmr.UserId })
                .OnDelete(DeleteBehavior.Cascade);

            // Use NoAction to avoid multiple cascade paths (Guild -> Roles -> GuildMemberRoles)
            entity.HasOne(gmr => gmr.Role)
                .WithMany(r => r.MemberRoles)
                .HasForeignKey(gmr => gmr.RoleId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(gmr => gmr.RoleId);
            entity.HasIndex(gmr => new { gmr.GuildId, gmr.UserId });

            entity.Property(e => e.AssignedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Friendship configuration
        modelBuilder.Entity<Friendship>(entity =>
        {
            entity.HasOne(f => f.Requester)
                .WithMany()
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.Addressee)
                .WithMany()
                .HasForeignKey(f => f.AddresseeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index: Only one friendship record per user pair (regardless of direction)
            entity.HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();

            entity.HasIndex(f => f.RequesterId);
            entity.HasIndex(f => f.AddresseeId);
            entity.HasIndex(f => new { f.RequesterId, f.Status });
            entity.HasIndex(f => new { f.AddresseeId, f.Status });

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // DirectMessageChannel configuration
        modelBuilder.Entity<DirectMessageChannel>(entity =>
        {
            entity.HasOne(dmc => dmc.User1)
                .WithMany()
                .HasForeignKey(dmc => dmc.User1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(dmc => dmc.User2)
                .WithMany()
                .HasForeignKey(dmc => dmc.User2Id)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique constraint: Only one DM channel per user pair (User1Id < User2Id)
            entity.HasIndex(dmc => new { dmc.User1Id, dmc.User2Id }).IsUnique();

            entity.HasIndex(dmc => dmc.User1Id);
            entity.HasIndex(dmc => dmc.User2Id);
            entity.HasIndex(dmc => dmc.LastMessageAt);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // DirectMessage configuration
        modelBuilder.Entity<DirectMessage>(entity =>
        {
            entity.HasOne(dm => dm.Channel)
                .WithMany(dmc => dmc.Messages)
                .HasForeignKey(dm => dm.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(dm => dm.Sender)
                .WithMany()
                .HasForeignKey(dm => dm.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(dm => dm.ChannelId);
            entity.HasIndex(dm => dm.SenderId);
            entity.HasIndex(dm => dm.CreatedAt);
            entity.HasIndex(dm => new { dm.ChannelId, dm.CreatedAt });

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });
    }
}






