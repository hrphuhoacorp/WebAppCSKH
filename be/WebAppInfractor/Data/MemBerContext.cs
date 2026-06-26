using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Recruitment;

namespace WebAppInfractor.Data;

public partial class MemBerContext : DbContext
{
    public MemBerContext() { }

    public MemBerContext(DbContextOptions<MemBerContext> options)
        : base(options) { }

    public virtual DbSet<ActivityLog> ActivityLogs { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<ImportsHistory> ImportsHistories { get; set; }

    public virtual DbSet<InternalNews> InternalNews { get; set; }

    public virtual DbSet<MessageReport> MessageReports { get; set; }

    public virtual DbSet<MediaFile> MediaFiles { get; set; }

    public virtual DbSet<MediaFolder> MediaFolders { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<OrderStatus> OrderStatuses { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserRole> UserRoles { get; set; }

    public virtual DbSet<GiftBasket> GiftBaskets { get; set; }
    public virtual DbSet<GiftCodeMapping> GiftCodeMappings { get; set; }
    public virtual DbSet<GiftCodeChangeRequest> GiftCodeChangeRequests { get; set; }

    public virtual DbSet<NxtRow> NxtRows { get; set; }
    public virtual DbSet<NxtSapoPending> NxtSapoPendings { get; set; }

    public virtual DbSet<SapoImportBatch> SapoImportBatches { get; set; }
    public virtual DbSet<SapoSalesRow> SapoSalesRows { get; set; }
    public virtual DbSet<SapoCodeMapping> SapoCodeMappings { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }
    public virtual DbSet<RolePermission> RolePermissions { get; set; }
    public virtual DbSet<UserPermission> UserPermissions { get; set; }

    public virtual DbSet<RecruitmentSettings> RecruitmentSettings { get; set; }
    public virtual DbSet<RecruitmentCampaign> RecruitmentCampaigns { get; set; }
    public virtual DbSet<RecruitmentCandidate> RecruitmentCandidates { get; set; }
    public virtual DbSet<RecruitmentCandidateHistory> RecruitmentCandidateHistories { get; set; }
    public virtual DbSet<RecruitmentCategory> RecruitmentCategories { get; set; }
    public virtual DbSet<RecruitmentMailTemplate> RecruitmentMailTemplates { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("auth", "aal_level", new[] { "aal1", "aal2", "aal3" })
            .HasPostgresEnum("auth", "code_challenge_method", new[] { "s256", "plain" })
            .HasPostgresEnum("auth", "factor_status", new[] { "unverified", "verified" })
            .HasPostgresEnum("auth", "factor_type", new[] { "totp", "webauthn", "phone" })
            .HasPostgresEnum(
                "auth",
                "oauth_authorization_status",
                new[] { "pending", "approved", "denied", "expired" }
            )
            .HasPostgresEnum("auth", "oauth_client_type", new[] { "public", "confidential" })
            .HasPostgresEnum("auth", "oauth_registration_type", new[] { "dynamic", "manual" })
            .HasPostgresEnum("auth", "oauth_response_type", new[] { "code" })
            .HasPostgresEnum(
                "auth",
                "one_time_token_type",
                new[]
                {
                    "confirmation_token",
                    "reauthentication_token",
                    "recovery_token",
                    "email_change_token_new",
                    "email_change_token_current",
                    "phone_change_token",
                }
            )
            .HasPostgresEnum(
                "realtime",
                "action",
                new[] { "INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR" }
            )
            .HasPostgresEnum(
                "realtime",
                "equality_op",
                new[] { "eq", "neq", "lt", "lte", "gt", "gte", "in" }
            )
            .HasPostgresEnum("storage", "buckettype", new[] { "STANDARD", "ANALYTICS", "VECTOR" })
            .HasPostgresExtension("extensions", "pg_stat_statements")
            .HasPostgresExtension("extensions", "pgcrypto")
            .HasPostgresExtension("extensions", "uuid-ossp")
            .HasPostgresExtension("vault", "supabase_vault");

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_logs_pkey");

            entity.ToTable("activity_logs");

            entity.HasIndex(e => e.CreatedAt, "idx_activity_logs_created_at");

            entity.HasIndex(e => e.StaffCode, "idx_activity_logs_staff_code");

            entity.HasIndex(e => new { e.TableName, e.RecordId }, "idx_activity_logs_table_record");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action).HasMaxLength(50).HasColumnName("action");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IpAddress).HasMaxLength(45).HasColumnName("ip_address");
            entity.Property(e => e.NewData).HasColumnType("jsonb").HasColumnName("new_data");
            entity.Property(e => e.OldData).HasColumnType("jsonb").HasColumnName("old_data");
            entity.Property(e => e.RecordId).HasColumnName("record_id");
            entity.Property(e => e.StaffCode).HasMaxLength(50).HasColumnName("staff_code");
            entity.Property(e => e.TableName).HasMaxLength(100).HasColumnName("table_name");
            entity.Property(e => e.UserAgent).HasColumnName("user_agent");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity
                .HasOne(d => d.User)
                .WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("activity_logs_user_id_fkey");
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("branches_pkey");

            entity.ToTable("branches");

            entity.HasIndex(e => e.DeletedAt, "idx_branches_deleted_at");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.Name).HasMaxLength(255).HasColumnName("name");
            entity.Property(e => e.Phone).HasMaxLength(20).HasColumnName("phone");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("customers_pkey");

            entity.ToTable("customers");

            entity.HasIndex(e => e.CustomerCode, "customers_customer_code_key").IsUnique();

            entity.HasIndex(e => e.CustomerCode, "idx_customers_customer_code");

            entity.HasIndex(e => e.DeletedAt, "idx_customers_deleted_at");

            entity.HasIndex(e => e.ImportHistoryId, "idx_customers_import_history_id");

            entity.HasIndex(e => e.Phone, "idx_customers_phone");

            entity.Property(e => e.Id).HasColumnName("id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CustomerCode).HasMaxLength(50).HasColumnName("customer_code");
            entity.Property(e => e.DayOfBirth).HasColumnName("day_of_birth");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.ImportHistoryId).HasColumnName("import_history_id");
            entity.Property(e => e.LastOrderAt).HasColumnName("last_order_at");
            entity.Property(e => e.Name).HasMaxLength(255).HasColumnName("name");
            entity.Property(e => e.Phone).HasMaxLength(20).HasColumnName("phone");
            entity.Property(e => e.TotalOrders).HasDefaultValue(0).HasColumnName("total_orders");
            entity.Property(e => e.TotalRevenue).HasPrecision(18, 2).HasColumnName("total_revenue");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany(p => p.Customers)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("customers_created_by_fkey");

            entity
                .HasOne(d => d.ImportHistory)
                .WithMany(p => p.Customers)
                .HasForeignKey(d => d.ImportHistoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("customers_import_history_id_fkey");
        });

        modelBuilder.Entity<ImportsHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("imports_history_pkey");

            entity.ToTable("imports_history");

            entity.HasIndex(e => e.ImportDate, "idx_imports_import_date");

            entity.HasIndex(e => e.UserId, "idx_imports_user_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ErrorCount).HasDefaultValue(0).HasColumnName("error_count");
            entity
                .Property(e => e.ErrorDetails)
                .HasColumnType("jsonb")
                .HasColumnName("error_details");
            entity.Property(e => e.FileName).HasMaxLength(255).HasColumnName("file_name");
            entity
                .Property(e => e.ImportDate)
                .HasDefaultValueSql("now()")
                .HasColumnName("import_date");
            entity.Property(e => e.RollbackAt).HasColumnName("rollback_at");
            entity.Property(e => e.RollbackBy).HasColumnName("rollback_by");
            entity
                .Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'Imported'::character varying")
                .HasColumnName("status");
            entity.Property(e => e.SuccessCount).HasDefaultValue(0).HasColumnName("success_count");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.FileHash).HasMaxLength(64).HasColumnName("file_hash");

            entity
                .HasOne(d => d.RollbackByNavigation)
                .WithMany(p => p.ImportsHistoryRollbackByNavigations)
                .HasForeignKey(d => d.RollbackBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_imports_rollback_by");

            entity
                .HasOne(d => d.User)
                .WithMany(p => p.ImportsHistoryUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_imports_user");
        });

        modelBuilder.Entity<InternalNews>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("internal_news_pkey");

            entity.ToTable("internal_news");

            entity.HasIndex(e => e.CreatedAt, "idx_internal_news_created_at");

            entity.HasIndex(e => e.DeletedAt, "idx_internal_news_deleted_at");

            entity.HasIndex(e => e.IsPinned, "idx_internal_news_is_pinned");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.IsPinned).HasDefaultValue(false).HasColumnName("is_pinned");
            entity
                .Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValueSql("'draft'::character varying")
                .HasColumnName("status");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
            entity.Property(e => e.Title).HasMaxLength(255).HasColumnName("title");
            entity
                .Property(e => e.Type)
                .HasMaxLength(50)
                .HasDefaultValueSql("'announcement'::character varying")
                .HasColumnName("type");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.ViewCount).HasDefaultValue(0).HasColumnName("view_count");

            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany(p => p.InternalNews)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("internal_news_created_by_fkey");
        });

        modelBuilder.Entity<MessageReport>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("message_reports_pkey");
            entity.ToTable("message_reports");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ReportDate).HasColumnName("report_date");
            entity.Property(e => e.Type).HasMaxLength(20).HasColumnName("type");
            entity.Property(e => e.Count).HasColumnName("count");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("message_reports_created_by_fkey");
        });

        modelBuilder.Entity<MediaFile>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("media_files_pkey");

            entity.ToTable("media_files");

            entity.HasIndex(e => e.CreatedAt, "idx_media_files_created_at");

            entity.HasIndex(e => e.FolderId, "idx_media_files_folder_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.FileName).HasMaxLength(255).HasColumnName("file_name");
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.FileUrl).HasColumnName("file_url");
            entity.Property(e => e.FolderId).HasColumnName("folder_id");
            entity.Property(e => e.MimeType).HasMaxLength(100).HasColumnName("mime_type");
            entity.Property(e => e.OriginalName).HasMaxLength(255).HasColumnName("original_name");

            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany(p => p.MediaFiles)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("media_files_created_by_fkey");

            entity
                .HasOne(d => d.Folder)
                .WithMany(p => p.MediaFiles)
                .HasForeignKey(d => d.FolderId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("media_files_folder_id_fkey");
        });

        modelBuilder.Entity<MediaFolder>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("media_folders_pkey");

            entity.ToTable("media_folders");

            entity.HasIndex(e => e.ParentId, "idx_media_folders_parent_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.IsPublic).HasDefaultValue(true).HasColumnName("is_public");
            entity.Property(e => e.Name).HasMaxLength(255).HasColumnName("name");
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany(p => p.MediaFolders)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("media_folders_created_by_fkey");

            entity
                .HasOne(d => d.Parent)
                .WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("media_folders_parent_id_fkey");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("orders_pkey");

            entity.ToTable("orders");

            entity.HasIndex(e => e.BranchesId, "idx_orders_branches_id");

            entity.HasIndex(e => e.CustomerId, "idx_orders_customer_id");

            entity.HasIndex(e => e.DeletedAt, "idx_orders_deleted_at");

            entity.HasIndex(e => e.ImportHistoryId, "idx_orders_import_history_id");

            entity.HasIndex(e => e.OrderCode, "idx_orders_order_code");

            entity.HasIndex(e => e.PurchaseDate, "idx_orders_purchase_date");

            entity.HasIndex(e => e.StatusId, "idx_orders_status_id");

            entity.HasIndex(e => e.OrderCode, "orders_order_code_key");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BranchesId).HasColumnName("branches_id");
            entity.Property(e => e.Channel).HasMaxLength(100).HasColumnName("channel");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.GrossProfit).HasPrecision(18, 2).HasColumnName("gross_profit");
            entity.Property(e => e.ImportHistoryId).HasColumnName("import_history_id");
            entity.Property(e => e.OrderCode).HasMaxLength(50).HasColumnName("order_code");
            entity
                .Property(e => e.PurchaseDate)
                .HasDefaultValueSql("now()")
                .HasColumnName("purchase_date");
            entity.Property(e => e.Revenue).HasPrecision(18, 2).HasColumnName("revenue");
            entity.Property(e => e.ShippingFee).HasPrecision(18, 2).HasColumnName("shipping_fee");
            entity.Property(e => e.Source).HasMaxLength(100).HasColumnName("source");
            entity.Property(e => e.StatusId).HasColumnName("status_id");
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2).HasColumnName("tax_amount");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity
                .HasOne(d => d.Branches)
                .WithMany(p => p.Orders)
                .HasForeignKey(d => d.BranchesId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_branches_id_fkey");

            entity
                .HasOne(d => d.CreatedByNavigation)
                .WithMany(p => p.Orders)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_created_by_fkey");

            entity
                .HasOne(d => d.Customer)
                .WithMany(p => p.Orders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_customer_id_fkey");

            entity
                .HasOne(d => d.ImportHistory)
                .WithMany(p => p.Orders)
                .HasForeignKey(d => d.ImportHistoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_import_history_id_fkey");

            entity
                .HasOne(d => d.Status)
                .WithMany(p => p.Orders)
                .HasForeignKey(d => d.StatusId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_status_id_fkey");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("order_items_pkey");

            entity.ToTable("order_items");

            entity.HasIndex(e => e.Category, "idx_order_items_category");

            entity.HasIndex(e => e.ImportHistoryId, "idx_order_items_import_history_id");

            entity.HasIndex(e => e.OrderId, "idx_order_items_order_id");

            entity.HasIndex(e => e.Sku, "idx_order_items_sku");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Category).HasMaxLength(255).HasColumnName("category");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.GrossProfit).HasPrecision(18, 2).HasColumnName("gross_profit");
            entity.Property(e => e.ImportHistoryId).HasColumnName("import_history_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductName).HasMaxLength(255).HasColumnName("product_name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Revenue).HasPrecision(18, 2).HasColumnName("revenue");
            entity.Property(e => e.ServiceName).HasMaxLength(255).HasColumnName("service_name");
            entity.Property(e => e.ShippingFee).HasPrecision(18, 2).HasColumnName("shipping_fee");
            entity.Property(e => e.Sku).HasMaxLength(100).HasColumnName("sku");
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2).HasColumnName("tax_amount");
            entity.Property(e => e.Unit).HasMaxLength(50).HasColumnName("unit");
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2).HasColumnName("unit_price");

            entity
                .HasOne(d => d.ImportHistory)
                .WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.ImportHistoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("order_items_import_history_id_fkey");

            entity
                .HasOne(d => d.Order)
                .WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("order_items_order_id_fkey");
        });

        modelBuilder.Entity<OrderStatus>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("order_status_pkey");

            entity.ToTable("order_status");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Status).HasMaxLength(100).HasColumnName("status");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("roles_pkey");

            entity.ToTable("roles");

            entity.HasIndex(e => e.DeletedAt, "idx_roles_deleted_at");

            entity.HasIndex(e => e.Name, "idx_roles_name");

            entity.HasIndex(e => e.Name, "roles_name_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name).HasMaxLength(100).HasColumnName("name");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.BranchesId, "idx_users_branches_id");

            entity.HasIndex(e => e.DeletedAt, "idx_users_deleted_at");

            entity.HasIndex(e => e.Email, "idx_users_email");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.StaffCode, "users_staff_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BranchesId).HasColumnName("branches_id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DayOfBirth).HasColumnName("day_of_birth");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.Email).HasMaxLength(255).HasColumnName("email");
            entity.Property(e => e.Name).HasMaxLength(255).HasColumnName("name");
            entity.Property(e => e.Password).HasMaxLength(255).HasColumnName("password");
            entity.Property(e => e.Phone).HasMaxLength(255).HasColumnName("phone");
            entity.Property(e => e.StaffCode).HasMaxLength(50).HasColumnName("staff_code");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity
                .HasOne(d => d.Branches)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.BranchesId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("users_branches_id_fkey");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_roles_pkey");

            entity.ToTable("user_roles");

            entity.HasIndex(e => e.RoleId, "idx_user_roles_role_id");

            entity.HasIndex(e => e.UserId, "idx_user_roles_user_id");

            entity
                .HasIndex(e => new { e.UserId, e.RoleId }, "user_roles_user_id_role_id_key")
                .IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity
                .HasOne(d => d.Role)
                .WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("user_roles_role_id_fkey");

            entity
                .HasOne(d => d.User)
                .WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_roles_user_id_fkey");
        });

        modelBuilder.Entity<GiftBasket>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("gift_baskets_pkey");
            entity.ToTable("gift_baskets");

            entity.HasIndex(e => e.CurrentCode, "idx_gift_baskets_current_code");
            entity.HasIndex(e => e.BranchId, "idx_gift_baskets_branch_id");
            entity.HasIndex(e => e.Status, "idx_gift_baskets_status");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BasketUid).HasMaxLength(20).HasColumnName("basket_uid");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.BaseCode).HasMaxLength(50).HasColumnName("base_code");
            entity.Property(e => e.BasketName).HasMaxLength(255).HasColumnName("basket_name");
            entity.Property(e => e.CurrentCode).HasMaxLength(50).HasColumnName("current_code");
            entity.Property(e => e.Price).HasPrecision(18, 2).HasColumnName("price");
            entity.Property(e => e.EffectiveDate).HasMaxLength(20).HasColumnName("effective_date");
            entity
                .Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status")
                .HasDefaultValue("active");
            entity.Property(e => e.FrontImageUrl).HasColumnName("front_image_url");
            entity.Property(e => e.BackImageUrl).HasColumnName("back_image_url");
            entity
                .Property(e => e.ImageOverlayText)
                .HasMaxLength(255)
                .HasColumnName("image_overlay_text");
            entity.Property(e => e.Notice).HasColumnName("notice");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");

            entity
                .HasOne(d => d.Branch)
                .WithMany()
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("gift_baskets_branch_id_fkey");
        });

        modelBuilder.Entity<GiftCodeMapping>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("gift_code_mappings_pkey");
            entity.ToTable("gift_code_mappings");

            entity.HasIndex(e => new { e.Code, e.BranchId }, "idx_gift_code_mappings_code_branch");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasMaxLength(50).HasColumnName("code");
            entity.Property(e => e.BaseCode).HasMaxLength(50).HasColumnName("base_code");
            entity.Property(e => e.BasketName).HasMaxLength(255).HasColumnName("basket_name");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.BasketId).HasColumnName("basket_id");
            entity.Property(e => e.Active).HasColumnName("active").HasDefaultValue(true);
            entity
                .Property(e => e.Source)
                .HasMaxLength(50)
                .HasColumnName("source")
                .HasDefaultValue("library-sync");
            entity
                .Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity
                .HasOne(d => d.Branch)
                .WithMany()
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("gift_code_mappings_branch_id_fkey");

            entity
                .HasOne(d => d.Basket)
                .WithMany()
                .HasForeignKey(d => d.BasketId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("gift_code_mappings_basket_id_fkey");
        });

        modelBuilder.Entity<GiftCodeChangeRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("gift_code_change_requests_pkey");
            entity.ToTable("gift_code_change_requests");

            entity.HasIndex(e => e.Status, "idx_gift_ccr_status");
            entity.HasIndex(e => e.BranchId, "idx_gift_ccr_branch_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasMaxLength(50).HasColumnName("batch_id");
            entity.Property(e => e.BatchNote).HasColumnName("batch_note");
            entity.Property(e => e.RequestUid).HasMaxLength(50).HasColumnName("request_uid");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity
                .Property(e => e.BasketCodeOrName)
                .HasMaxLength(255)
                .HasColumnName("basket_code_or_name");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.Note).HasColumnName("note");
            entity
                .Property(e => e.Priority)
                .HasMaxLength(20)
                .HasColumnName("priority")
                .HasDefaultValue("normal");
            entity.Property(e => e.GroupCode).HasMaxLength(50).HasColumnName("group_code");
            entity.Property(e => e.Price).HasPrecision(18, 2).HasColumnName("price");
            entity
                .Property(e => e.SentZaloPhoto)
                .HasColumnName("sent_zalo_photo")
                .HasDefaultValue(true);
            entity.Property(e => e.FrontImageUrl).HasColumnName("front_image_url");
            entity.Property(e => e.BackImageUrl).HasColumnName("back_image_url");
            entity
                .Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status")
                .HasDefaultValue("pending");
            entity.Property(e => e.HandledBy).HasColumnName("handled_by");
            entity.Property(e => e.HandledAt).HasColumnName("handled_at");
            entity.Property(e => e.OldCode).HasMaxLength(50).HasColumnName("old_code");
            entity.Property(e => e.NewCode).HasMaxLength(50).HasColumnName("new_code");
            entity.Property(e => e.ApprovedDate).HasMaxLength(20).HasColumnName("approved_date");
            entity.Property(e => e.ResultNote).HasColumnName("result_note");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");

            entity
                .HasOne(d => d.Branch)
                .WithMany()
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("gift_ccr_branch_id_fkey");
        });

        modelBuilder.Entity<NxtRow>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("nxt_rows_pkey");
            entity.ToTable("nxt_rows");

            entity.HasIndex(e => new { e.CloseDate, e.Branch, e.ItemCode }, "idx_nxt_rows_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CloseDate).HasMaxLength(20).HasColumnName("close_date");
            entity.Property(e => e.Branch).HasMaxLength(100).HasColumnName("branch");
            entity.Property(e => e.ItemCode).HasMaxLength(100).HasColumnName("item_code");
            entity.Property(e => e.OpeningStock).HasPrecision(18, 2).HasColumnName("opening_stock");
            entity.Property(e => e.OpeningSource).HasColumnName("opening_source");
            entity.Property(e => e.GiftIn).HasPrecision(18, 2).HasColumnName("gift_in");
            entity.Property(e => e.ReceiveBranch).HasPrecision(18, 2).HasColumnName("receive_branch");
            entity.Property(e => e.TransferBranch).HasPrecision(18, 2).HasColumnName("transfer_branch");
            entity.Property(e => e.CancelBasket).HasPrecision(18, 2).HasColumnName("cancel_basket");
            entity.Property(e => e.SapoSold).HasPrecision(18, 2).HasColumnName("sapo_sold");
            entity.Property(e => e.Adjustment).HasPrecision(18, 2).HasColumnName("adjustment");
            entity.Property(e => e.ActualStock).HasPrecision(18, 2).HasColumnName("actual_stock");
            entity.Property(e => e.SoldNotPicked).HasPrecision(18, 2).HasColumnName("sold_not_picked");
            entity.Property(e => e.StockStatus).HasMaxLength(200).HasColumnName("stock_status");
            entity.Property(e => e.Revenue).HasPrecision(18, 2).HasColumnName("revenue");
            entity.Property(e => e.OrderCount).HasPrecision(18, 2).HasColumnName("order_count");
            entity.Property(e => e.TransferNotes).HasColumnType("jsonb").HasColumnName("transfer_notes");
            entity.Property(e => e.Inactive).HasColumnName("inactive").HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");
        });

        modelBuilder.Entity<NxtSapoPending>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("nxt_sapo_pending_pkey");
            entity.ToTable("nxt_sapo_pending");

            entity.Property(e => e.Id).HasColumnName("id").UseIdentityColumn();
            entity.Property(e => e.CloseDate).IsRequired().HasMaxLength(20).HasColumnName("close_date");
            entity.Property(e => e.Branch).IsRequired().HasMaxLength(100).HasColumnName("branch");
            entity.Property(e => e.ItemCode).IsRequired().HasMaxLength(100).HasColumnName("item_code");
            entity.Property(e => e.Qty).HasPrecision(18, 2).HasColumnName("qty");
            entity.Property(e => e.Reason).HasMaxLength(500).HasColumnName("reason");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("pending").HasColumnName("status");
            entity.Property(e => e.CreatedBy).HasMaxLength(100).HasColumnName("created_by");
            entity.Property(e => e.CreatedByName).HasMaxLength(200).HasColumnName("created_by_name");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
            entity.Property(e => e.SapoDate).HasMaxLength(20).HasColumnName("sapo_date");
            entity.Property(e => e.SapoOrderCode).HasMaxLength(200).HasColumnName("sapo_order_code");
            entity.Property(e => e.CompletedBy).HasMaxLength(100).HasColumnName("completed_by");
            entity.Property(e => e.CompletedByName).HasMaxLength(200).HasColumnName("completed_by_name");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CompletionNote).HasColumnName("completion_note");
            entity.Property(e => e.PositiveAdjDate).HasMaxLength(20).HasColumnName("positive_adj_date");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SapoImportBatch>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("sapo_import_batches_pkey");
            entity.ToTable("sapo_import_batches");

            entity.HasIndex(e => e.BatchId, "idx_sapo_import_batches_batch_id").IsUnique();
            entity.HasIndex(e => e.ImportedAt, "idx_sapo_import_batches_imported_at");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasMaxLength(50).HasColumnName("batch_id");
            entity.Property(e => e.ImportedAt).HasMaxLength(30).HasColumnName("imported_at");
            entity.Property(e => e.SapoFileName).HasMaxLength(255).HasColumnName("sapo_file_name");
            entity.Property(e => e.MappingFileName).HasMaxLength(255).HasColumnName("mapping_file_name");
            entity.Property(e => e.RowCount).HasColumnName("row_count");
            entity.Property(e => e.DateRange).HasMaxLength(50).HasColumnName("date_range");
            entity.Property(e => e.NetRevenue).HasPrecision(18, 2).HasColumnName("net_revenue");
            entity.Property(e => e.Revenue).HasPrecision(18, 2).HasColumnName("revenue");
            entity.Property(e => e.Qty).HasPrecision(18, 2).HasColumnName("qty");
            entity.Property(e => e.Orders).HasPrecision(18, 2).HasColumnName("orders");
            entity.Property(e => e.MappingCount).HasColumnName("mapping_count");
            entity.Property(e => e.WarningCount).HasColumnName("warning_count");
            entity.Property(e => e.UploadedBy).HasMaxLength(100).HasColumnName("uploaded_by");
            entity.Property(e => e.Version).HasMaxLength(20).HasColumnName("version");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
        });

        modelBuilder.Entity<SapoSalesRow>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("sapo_sales_rows_pkey");
            entity.ToTable("sapo_sales_rows");

            entity.HasIndex(e => e.BatchId, "idx_sapo_sales_rows_batch_id");
            entity.HasIndex(e => new { e.Date, e.Branch, e.ReportCode }, "idx_sapo_sales_rows_date_branch_code");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasMaxLength(50).HasColumnName("batch_id");
            entity.Property(e => e.Date).HasMaxLength(20).HasColumnName("date");
            entity.Property(e => e.Branch).HasMaxLength(100).HasColumnName("branch");
            entity.Property(e => e.ProductType).HasMaxLength(100).HasColumnName("product_type");
            entity.Property(e => e.Sku).HasMaxLength(100).HasColumnName("sku");
            entity.Property(e => e.SapoCode).HasMaxLength(100).HasColumnName("sapo_code");
            entity.Property(e => e.ReportCode).HasMaxLength(100).HasColumnName("report_code");
            entity.Property(e => e.ReportName).HasMaxLength(255).HasColumnName("report_name");
            entity.Property(e => e.ProductName).HasMaxLength(255).HasColumnName("product_name");
            entity.Property(e => e.BasketGroup).HasMaxLength(100).HasColumnName("basket_group");
            entity.Property(e => e.PriceBucket).HasMaxLength(30).HasColumnName("price_bucket");
            entity.Property(e => e.Price).HasPrecision(18, 2).HasColumnName("price");
            entity.Property(e => e.Qty).HasPrecision(18, 2).HasColumnName("qty");
            entity.Property(e => e.Orders).HasPrecision(18, 2).HasColumnName("orders");
            entity.Property(e => e.Revenue).HasPrecision(18, 2).HasColumnName("revenue");
            entity.Property(e => e.NetRevenue).HasPrecision(18, 2).HasColumnName("net_revenue");
            entity.Property(e => e.ResolveSource).HasMaxLength(50).HasColumnName("resolve_source");
            entity.Property(e => e.MatchedCode).HasMaxLength(100).HasColumnName("matched_code");
            entity.Property(e => e.MappingPrice).HasPrecision(18, 2).HasColumnName("mapping_price");
            entity.Property(e => e.MappingDate).HasMaxLength(20).HasColumnName("mapping_date");
            entity.Property(e => e.MappingNote).HasColumnName("mapping_note");
            entity.Property(e => e.AutoGroupNote).HasColumnName("auto_group_note");
            entity.Property(e => e.Warning).HasMaxLength(100).HasColumnName("warning");
            entity.Property(e => e.UploadedBy).HasMaxLength(100).HasColumnName("uploaded_by");
            entity.Property(e => e.UploadedAt).HasMaxLength(30).HasColumnName("uploaded_at");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
        });

        modelBuilder.Entity<SapoCodeMapping>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("sapo_code_mappings_pkey");
            entity.ToTable("sapo_code_mappings");

            entity.HasIndex(e => new { e.OldCode, e.NewCode, e.EffectiveDate }, "idx_sapo_code_mappings_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OldCode).HasMaxLength(100).HasColumnName("old_code");
            entity.Property(e => e.NewCode).HasMaxLength(100).HasColumnName("new_code");
            entity.Property(e => e.Price).HasPrecision(18, 2).HasColumnName("price");
            entity.Property(e => e.EffectiveDate).HasMaxLength(20).HasColumnName("effective_date");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Active).HasDefaultValue(true).HasColumnName("active");
            entity.Property(e => e.UploadedAt).HasMaxLength(30).HasColumnName("uploaded_at");
            entity.Property(e => e.Source).HasMaxLength(100).HasColumnName("source");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("permissions_pkey");
            entity.ToTable("permissions");
            entity.HasIndex(e => e.Code, "permissions_code_key").IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasMaxLength(100).HasColumnName("code");
            entity.Property(e => e.Name).HasMaxLength(255).HasColumnName("name");
            entity.Property(e => e.Module).HasMaxLength(100).HasColumnName("module");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("role_permissions_pkey");
            entity.ToTable("role_permissions");
            entity.HasIndex(e => new { e.RoleId, e.PermissionId }, "role_permissions_role_id_permission_id_key").IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");

            entity.HasOne(d => d.Role)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("role_permissions_role_id_fkey");

            entity.HasOne(d => d.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.PermissionId)
                .HasConstraintName("role_permissions_permission_id_fkey");
        });

        modelBuilder.Entity<UserPermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_permissions_pkey");
            entity.ToTable("user_permissions");
            entity.HasIndex(e => new { e.UserId, e.PermissionId }, "user_permissions_user_id_permission_id_key").IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");

            entity.HasOne(d => d.User)
                .WithMany(p => p.UserPermissions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_permissions_user_id_fkey");

            entity.HasOne(d => d.Permission)
                .WithMany(p => p.UserPermissions)
                .HasForeignKey(d => d.PermissionId)
                .HasConstraintName("user_permissions_permission_id_fkey");
        });

        modelBuilder.Entity<RecruitmentSettings>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_settings_pkey");
            entity.ToTable("recruitment_settings");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DefaultContact).HasMaxLength(200).HasColumnName("default_contact");
            entity.Property(e => e.DefaultPhone).HasMaxLength(50).HasColumnName("default_phone");
            entity.Property(e => e.DefaultLocation).HasMaxLength(500).HasColumnName("default_location");
            entity.Property(e => e.Signature).HasColumnName("signature");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");
        });

        modelBuilder.Entity<RecruitmentCampaign>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_campaigns_pkey");
            entity.ToTable("recruitment_campaigns");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasMaxLength(300).HasColumnName("name");
            entity.Property(e => e.Position).HasMaxLength(200).HasColumnName("position");
            entity.Property(e => e.QuantityNeeded).HasColumnName("quantity_needed");
            entity.Property(e => e.StartDate).HasMaxLength(20).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasMaxLength(20).HasColumnName("end_date");
            entity.Property(e => e.PostContent).HasColumnName("post_content");
            entity.Property(e => e.Requirements).HasColumnName("requirements");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("open").HasColumnName("status");
            entity.Property(e => e.CreatedBy).HasMaxLength(100).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
        });

        modelBuilder.Entity<RecruitmentCandidate>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_candidates_pkey");
            entity.ToTable("recruitment_candidates");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.CandidateName).HasMaxLength(300).HasColumnName("candidate_name");
            entity.Property(e => e.Phone).HasMaxLength(50).HasColumnName("phone");
            entity.Property(e => e.Email).HasMaxLength(300).HasColumnName("email");
            entity.Property(e => e.Position).HasMaxLength(200).HasColumnName("position");
            entity.Property(e => e.Source).HasMaxLength(100).HasColumnName("source");
            entity.Property(e => e.SourceOtherNote).HasMaxLength(500).HasColumnName("source_other_note");
            entity.Property(e => e.CvLink).HasMaxLength(1000).HasColumnName("cv_link");
            entity.Property(e => e.CvFileName).HasMaxLength(300).HasColumnName("cv_file_name");
            entity.Property(e => e.CvFilePath).HasMaxLength(1000).HasColumnName("cv_file_path");
            entity.Property(e => e.CvNote).HasColumnName("cv_note");
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("new").HasColumnName("status");
            entity.Property(e => e.WaitingFor).HasMaxLength(200).HasColumnName("waiting_for");
            entity.Property(e => e.InterviewTime).HasMaxLength(100).HasColumnName("interview_time");
            entity.Property(e => e.InterviewNote).HasColumnName("interview_note");
            entity.Property(e => e.Result).HasMaxLength(100).HasColumnName("result");
            entity.Property(e => e.OfferNote).HasColumnName("offer_note");
            entity.Property(e => e.OnboardDate).HasMaxLength(20).HasColumnName("onboard_date");
            entity.Property(e => e.MailInviteSent).HasDefaultValue(false).HasColumnName("mail_invite_sent");
            entity.Property(e => e.MailResultSent).HasDefaultValue(false).HasColumnName("mail_result_sent");
            entity.Property(e => e.CreatedBy).HasMaxLength(100).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");

            entity.HasOne<RecruitmentCampaign>()
                .WithMany()
                .HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("recruitment_candidates_campaign_id_fkey");
        });

        modelBuilder.Entity<RecruitmentCandidateHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_candidate_history_pkey");
            entity.ToTable("recruitment_candidate_history");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CandidateId).HasColumnName("candidate_id");
            entity.Property(e => e.ActedAt).HasDefaultValueSql("now()").HasColumnName("acted_at");
            entity.Property(e => e.ActedBy).HasMaxLength(100).HasColumnName("acted_by");
            entity.Property(e => e.Action).HasMaxLength(200).HasColumnName("action");
            entity.Property(e => e.Note).HasColumnName("note");

            entity.HasOne<RecruitmentCandidate>()
                .WithMany()
                .HasForeignKey(e => e.CandidateId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("recruitment_candidate_history_candidate_id_fkey");
        });

        modelBuilder.Entity<RecruitmentCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_categories_pkey");
            entity.ToTable("recruitment_categories");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Type).HasMaxLength(100).HasColumnName("type");
            entity.Property(e => e.Value).HasMaxLength(300).HasColumnName("value");
            entity.Property(e => e.SortOrder).HasDefaultValue(0).HasColumnName("sort_order");
        });

        modelBuilder.Entity<RecruitmentMailTemplate>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("recruitment_mail_templates_pkey");
            entity.ToTable("recruitment_mail_templates");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TemplateType).HasMaxLength(100).HasColumnName("template_type");
            entity.Property(e => e.Subject).HasMaxLength(500).HasColumnName("subject");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
