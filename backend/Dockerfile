# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:20387c6674c30e46def0cc8cb557bd2a69b35afdf18c19c3694638d0a90897e4 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ChordAPI.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:779b0b298964fe93e6c6388c8bb823393a7c301b79cd5b3d80632bc886b2ffd4 AS runtime
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

