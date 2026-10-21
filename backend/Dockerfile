# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:d9ad72f6b3eb5d61adb158db510ae1c3098c12c92d23ab8da833418275f1c652 AS build
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
FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:88fcfc1b81c43afa15ba3c138c57d77f77c1cb5118ae9d7024c94e82e2895aa5 AS runtime
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

