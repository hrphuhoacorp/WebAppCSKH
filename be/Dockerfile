FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore "WebAppAPI/WebAppAPI.csproj"
RUN dotnet publish "WebAppAPI/WebAppAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Tạo thư mục media
RUN mkdir -p /data/phf-media

# Khai báo VOLUME (tùy chọn, quan trọng là -v khi docker run)
VOLUME /data/phf-media

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "WebAppAPI.dll"]