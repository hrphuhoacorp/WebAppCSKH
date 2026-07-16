FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY WebAppInfractor/WebAppInfractor.csproj WebAppInfractor/
COPY WebAppAPI/WebAppAPI.csproj WebAppAPI/

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore "WebAppAPI/WebAppAPI.csproj"

COPY . .

RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish "WebAppAPI/WebAppAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p /data/phf-media
VOLUME /data/phf-media

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "WebAppAPI.dll"]
