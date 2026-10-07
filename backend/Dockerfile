# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:01fabc4758d1d74e39eda700c8463dae6241a61481f973683692ddcb59a5eeb7 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ChordAPI.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:2680706c9656fafe34876446d694fd25077fd0b5da478f38d56073ac6c21d37e AS runtime
WORKDIR /app

# Install curl for healthcheck.
# apt-get upgrade: Microsoft'un aspnet taban imaji Debian guvenlik yamasindan
# sonra hemen yeniden derlenmiyor (Ekim 2026: guncel 9.0 digest'i bile perl-base
# deb12u3 tasiyordu, yamali deb12u4 Debian'da cikmisti -> CRITICAL
# CVE-2026-13221, CyberScan P0). Derleme aninda guvenlik guncellemelerini almak,
# Renovate'in digest bump'ini beklemeden bu boslugu kapatir.
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

# Copy published app
COPY --from=build /app/publish .

# Expose ports
EXPOSE 80
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

ENTRYPOINT ["dotnet", "ChordAPI.dll"]

