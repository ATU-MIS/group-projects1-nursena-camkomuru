# Skycheck Başlatma Scripti
Write-Host "SkyCheck Başlatılıyor..." -ForegroundColor Cyan

# 1. Python Kontrolü
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python bulunamadı! Lütfen Python yükleyin."
    Pause
    Exit
}

# 2. Gerekli Kütüphanelerin Kontrolü (Hızlıca var mı diye bakar, yoksa kurar)
# Basitlik olması açısından direkt install komutunu çalıştırıyoruz, kuruluysa zaten 'already satisfied' der geçer.
Write-Host "Kütüphaneler kontrol ediliyor..." -ForegroundColor Yellow
pip install -r requirements.txt | Out-Null

# 3. Backend'i Başlat (Arka Planda)
Write-Host "Sunucu başlatılıyor..." -ForegroundColor Green
$appProcess = Start-Process "python" -ArgumentList "app.py" -PassThru -NoNewWindow

# 4. Tarayıcıyı Aç (Biraz bekleyip)
Start-Sleep -Seconds 3
Write-Host "Tarayıcı açılıyor..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5000"

Write-Host "Uygulama Çalışıyor! Durdurmak için bu pencereyi kapatın." -ForegroundColor Magenta

# Scriptin kapanmamasını sağla (Backend process'i açık kalsın diye bekleyebiliriz ama 
# Start-Process NoNewWindow kullandığımız için bu pencere kapanırsa o da kapanabilir veya açık kalabilir.
# Genelde kullanıcı deneyimi için app.py ayrı pencerede açılırsa daha iyi debug edilir ama 
# "One Click" mantığında arka planda çalışıp tarayıcı açması daha şık.
# Ancak Python penceresi açılmazsa kapatmak zor olabilir. 
# Bu yüzden yukarıda NoNewWindow dedik, yani output buraya akar.
# Bu script kapanırsa app kapanmayabilir, taskkill gerekir.
# Basit yöntem: Bu pencereyi açık tutalım.

Read-Host "Çıkış yapmak için Enter'a basın..."
Stop-Process -Id $appProcess.Id -Force
Write-Host "Kapatıldı."
