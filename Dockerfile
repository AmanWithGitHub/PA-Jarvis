
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/AmanJarvis.API/AmanJarvis.API.csproj", "backend/AmanJarvis.API/"]

RUN dotnet restore "backend/AmanJarvis.API/AmanJarvis.API.csproj"

COPY . .

WORKDIR /src/backend/AmanJarvis.API

RUN dotnet publish "AmanJarvis.API.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "dotnet AmanJarvis.API.dll --urls http://0.0.0.0:${PORT:-8080}"]
