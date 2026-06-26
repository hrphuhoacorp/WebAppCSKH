using Microsoft.Extensions.DependencyInjection;

public static class RepositoryServiceRegistration
{
    public static IServiceCollection AddRepositoryServices(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBranchRepository, BranchRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IUserRoleRepository, UserRoleRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IImportsHistoryRepository, ImportsHistoryRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderStatusRepository, OrderStatusRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRoleRepository, UserRoleRepository>();
        services.AddScoped<IGiftBasketRepository, GiftBasketRepository>();
        services.AddScoped<IGiftCodeMappingRepository, GiftCodeMappingRepository>();
        services.AddScoped<IGiftCodeChangeRequestRepository, GiftCodeChangeRequestRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IUserPermissionRepository, UserPermissionRepository>();
        return services;
    }
}
