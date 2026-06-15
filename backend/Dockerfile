# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:1f2cb07e7ced57c4ea61163d485a2ee1cffd63763c6b17a4447ce734ff236475 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ChordAPI.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:5d6784c19991f6cd2b07acbc4f40236e9b90fe4200aebb83c85370fc25a7f248 AS runtime
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published app
COPY --from=build /app/publish .

# Expose ports
EXPOSE 80
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

ENTRYPOINT ["dotnet", "ChordAPI.dll"]

