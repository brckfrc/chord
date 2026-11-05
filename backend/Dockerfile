# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ChordAPI.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
# ImageSharp 4 validates a Six Labors license at Release build time. The license
# is mounted as a BuildKit secret only for this RUN, so it never ends up in any
# image layer (repo is public). CI/deploy pass it via the SIXLABORS_LICENSE
# repository secret; locally: docker build --secret id=sixlabors_lic,src=backend/sixlabors.lic
RUN --mount=type=secret,id=sixlabors_lic,target=/src/sixlabors.lic \
    dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:de0ee358cdd672f7017a003bed21e9ac9ed48a27c922a59b18175b6e82fa7fee AS runtime
WORKDIR /app

# Install curl for healthcheck.
# apt-get upgrade: Microsoft'un aspnet taban imaji (10.0: Ubuntu 24.04) dagitimin
# guvenlik yamasindan sonra hemen yeniden derlenmiyor (Ekim 2026: Debian tabanli
# 9.0'in guncel digest'i bile perl-base deb12u3 tasiyordu, yamali deb12u4
# Debian'da cikmisti -> CRITICAL CVE-2026-13221, CyberScan P0). Derleme aninda
# guvenlik guncellemelerini almak,
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

