FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Lấy toàn bộ source code (bao gồm cả thư mục api và infractor) vào Docker
COPY . .

# Restore cho toàn bộ Solution hoặc cả 2 dự án để tránh thiếu thư viện liên kết
RUN dotnet restore "WebAppAPI/WebAppAPI.csproj"

# Build và Publish dự án API ra thư mục /app/publish
RUN dotnet publish "WebAppAPI/WebAppAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Chạy ứng dụng bằng Runtime cực nhẹ
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Cấu hình Port chạy chính xác theo ý bạn
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "WebAppAPI.dll"]