# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:1330d3c4144aec2695036a125d9a3b49a1fc555c9024c981248fa83d40fa8b23 AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:6b29f9d598b387b4b44653408d773cbdbf8f1d6b24289460b228a24f31a38b53 AS runtime
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

