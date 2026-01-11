document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('citySelect');
    const resultCard = document.getElementById('resultCard');
    const loader = document.getElementById('loader');

    // Initialize Map
    const map = L.map('map-container').setView([39.0, 35.0], 6); // Turkey Center

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Turkey Cities (Provinces) for Dropdown
    const cities = [
        "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydin",
        "Balikesir", "Bartin", "Batman", "Bayburt", "Bilecik", "Bingol", "Bitlis", "Bolu", "Burdur", "Bursa", "Canakkale",
        "Cankiri", "Corum", "Denizli", "Diyarbakir", "Duzce", "Edirne", "Elazig", "Erzincan", "Erzurum", "Eskisehir",
        "Gaziantep", "Giresun", "Gumushane", "Hakkari", "Hatay", "Igdir", "Isparta", "Istanbul", "Izmir", "Kahramanmaras",
        "Karabuk", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kirikkale", "Kirklareli", "Kirsehir", "Kocaeli",
        "Konya", "Kutahya", "Malatya", "Manisa", "Mardin", "Mersin", "Mugla", "Mus", "Nevsehir", "Nigde", "Ordu", "Osmaniye",
        "Rize", "Sakarya", "Samsun", "Sanliurfa", "Siirt", "Sinop", "Sirnak", "Sivas", "Tekirdag", "Tokat", "Trabzon",
        "Tunceli", "Usak", "Van", "Yalova", "Yozgat", "Zonguldak"
    ];

    // Populate Dropdown
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    // Load GeoJSON for Map Interaction
    fetch('https://raw.githubusercontent.com/alpers/Turkey-Maps-GeoJSON/master/tr-cities.json')
        .then(response => {
            if (!response.ok) throw new Error("HTTP error " + response.status);
            return response.json();
        })
        .then(data => {
            L.geoJSON(data, {
                style: {
                    color: "#00d2ff",
                    weight: 1,
                    opacity: 0.6,
                    fillOpacity: 0.2
                },
                onEachFeature: (feature, layer) => {
                    const cityName = feature.properties.name || feature.properties.NAME || feature.properties.il;

                    if (cityName) {
                        layer.bindTooltip(cityName, {
                            permanent: false, // Show only on hover
                            sticky: true,     // Follow the mouse
                            className: "city-label"
                        });
                    }

                    layer.on('mouseover', () => {
                        layer.setStyle({
                            weight: 2,
                            color: '#fff',
                            fillOpacity: 0.5
                        });
                    });
                    layer.on('mouseout', () => {
                        layer.setStyle({
                            weight: 1,
                            color: '#00d2ff',
                            fillOpacity: 0.2
                        });
                    });
                    layer.on('click', () => {
                        console.log("Feature properties:", feature.properties);
                        // Try standard property names
                        const cityName = feature.properties.name || feature.properties.NAME || feature.properties.il;

                        if (!cityName) {
                            console.error("City name not found in properties", feature.properties);
                            return;
                        }

                        console.log("Clicked city:", cityName);
                        // Normalize city name if needed or match with dropdown
                        selectCity(cityName);
                    });
                }
            }).addTo(map);
        })
        .catch(err => {
            console.error("Map GeoJSON Error:", err);
            alert("Harita verisi yüklenemedi. Lütfen sayfayı yenileyin.");
        });


    // Event Listeners
    citySelect.addEventListener('change', (e) => selectCity(e.target.value));
    document.getElementById('locateBtn').addEventListener('click', locateUser);

    function locateUser() {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        loader.style.display = 'block';

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                // Reverse Geocode via Backend
                const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
                const data = await response.json();

                if (data.city) {
                    // Normalize because API might return "İstanbul" but list has "Istanbul"
                    // Or "Yenimahalle" which is part of Ankara. This is a bit tricky.
                    // For now, we assume province level match or we just use what API gives to selectCity
                    // selectCity logic tries to find it in dropdown.

                    // Note: OpenWeather reverse geo returns 'name' which is usually the specific location (district),
                    // but sometimes we need the province. 

                    alert(`Konumunuz bulundu: ${data.city}`);
                    selectCity(data.city);
                } else {
                    alert("Şehir bulunamadı.");
                }
            } catch (err) {
                console.error(err);
                alert("Konum servisi hatası.");
            } finally {
                loader.style.display = 'none';
            }
        }, () => {
            loader.style.display = 'none';
            alert("Konumunuza erişilemedi.");
        });
    }

    function normalizeCityName(name) {
        const charMap = {
            'ç': 'c', 'Ç': 'C',
            'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'I': 'I', 'İ': 'I', // Special case for Istanbul if needed, otherwise I -> I
            'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S',
            'ü': 'u', 'Ü': 'U'
        };
        // Special Handling for specific cities if simple mapping isn't enough
        if (name === "İstanbul") return "Istanbul";
        if (name === "Iğdır") return "Igdir";
        if (name === "İzmir") return "Izmir";

        return name.replace(/[çğışüöÇĞİŞÜÖ]/g, (match) => charMap[match] || match);
    }

    // --- Favorites Logic ---
    const favBtn = document.getElementById('favBtn');
    const favoritesList = document.getElementById('favoritesList');
    let favorites = JSON.parse(localStorage.getItem('skycheck_favorites')) || [];

    function updateFavoritesUI() {
        favoritesList.innerHTML = '';
        favorites.forEach(city => {
            const chip = document.createElement('div');
            chip.className = 'fav-chip';
            chip.textContent = city;
            chip.onclick = () => selectCity(city);
            favoritesList.appendChild(chip);
        });

        // Update Star Icon State
        const currentCity = document.getElementById('cityName').textContent;
        if (favorites.includes(currentCity)) {
            favBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
            favBtn.classList.add('active');
        } else {
            favBtn.querySelector('i').classList.replace('fa-solid', 'fa-regular');
            favBtn.classList.remove('active');
        }
    }

    favBtn.addEventListener('click', () => {
        const currentCity = document.getElementById('cityName').textContent;
        if (!currentCity || currentCity === "Ankara") return; // Default or empty

        if (favorites.includes(currentCity)) {
            favorites = favorites.filter(c => c !== currentCity);
        } else {
            favorites.push(currentCity);
        }
        localStorage.setItem('skycheck_favorites', JSON.stringify(favorites));
        updateFavoritesUI();
    });

    // Initial load
    updateFavoritesUI();


    // --- Map Layers Logic ---
    // Add default OWM layers if api key logic was client side, but we proxy.
    const layers = {
        "Bulutlar": "clouds_new",
        "Yağış": "precipitation_new",
        "Sıcaklık": "temp_new"
    };

    // Add Layer Control (Simple Loop)
    const layerControl = L.control({ position: 'topright' });
    layerControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'layer-control');
        // Simple Select for Layers
        const select = document.createElement('select');
        select.style.padding = "5px";
        select.style.borderRadius = "5px";
        select.innerHTML = `<option value="">Katman Seç</option>`;

        for (const [name, code] of Object.entries(layers)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            select.appendChild(option);
        }

        select.onchange = (e) => {
            const layerCode = e.target.value;
            // Remove existing overlay
            map.eachLayer((layer) => {
                if (layer._url && layer._url.includes('/api/tiles/')) {
                    map.removeLayer(layer);
                }
            });

            if (layerCode) {
                L.tileLayer(`/api/tiles/${layerCode}/{z}/{x}/{y}`, {
                    maxZoom: 19,
                    opacity: 0.7
                }).addTo(map);
            }
        };

        // Prevent map clicks
        L.DomEvent.disableClickPropagation(div);
        div.appendChild(select);
        return div;
    };
    layerControl.addTo(map);


    // --- Chart Logic ---
    let forecastChart = null;

    function renderChart(forecastData) {
        const ctx = document.getElementById('forecastChart').getContext('2d');

        // Extract 3-hour Intervals (first 8-10 points to show trend)
        // Let's take every item for next 24h
        const next24h = forecastData.list.slice(0, 9);

        const labels = [];
        const temps = [];

        next24h.forEach(item => {
            const date = new Date(item.dt * 1000);
            labels.push(date.getHours() + ":00");
            temps.push(Math.round(item.main.temp));
        });

        if (forecastChart) {
            forecastChart.destroy();
        }

        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sıcaklık (°C)',
                    data: temps,
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y + ' °C';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    }

    async function selectCity(rawCity) {
        if (!rawCity) return;

        // Normalize for Dropdown matching
        let selectedCity = rawCity;
        // Check favorites matching too? simple string match for now.

        const options = Array.from(citySelect.options).map(o => o.value);

        // 1. Direct match
        if (!options.includes(selectedCity)) {
            // 2. Try normalizing
            let normalized = normalizeCityName(selectedCity);
            if (options.includes(normalized)) {
                selectedCity = normalized;
            } else {
                // 3. Try to find case-insensitive match or loose match
                const found = options.find(o =>
                    o.toLowerCase() === selectedCity.toLowerCase() ||
                    o.toLowerCase() === normalized.toLowerCase()
                );
                if (found) selectedCity = found;
            }
        }

        // Update Dropdown
        if (options.includes(selectedCity)) {
            citySelect.value = selectedCity;
        }

        // UI Reset
        resultCard.style.display = 'none';
        loader.style.display = 'block';

        try {
            const response = await fetch(`/api/air-quality?city=${selectedCity}`);
            const data = await response.json();

            if (response.ok) {
                updateUI(selectedCity, data);
            } else { // Handle error gracefully, maybe retry with normalized name
                // console.log('Error fetching data: ' + (data.error || 'Unknown error'));
                alert('Could not fetch data for ' + selectedCity);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to server.');
        } finally {
            loader.style.display = 'none';
        }
    }

    function updateUI(city, data) {
        if (!data.pollution || !data.weather) return;

        const pollution = data.pollution.list[0];
        const weather = data.weather;

        const aqi = pollution.main.aqi;
        const components = pollution.components;

        // Update Text
        document.getElementById('cityName').textContent = city;

        // Update Favorite Icon State for new city
        updateFavoritesUI();

        // Weather Summary
        const temp = Math.round(weather.main.temp);
        const desc = weather.weather[0].description;
        const iconCode = weather.weather[0].icon;

        document.getElementById('weatherSummary').innerHTML = `
            <img class="weather-icon" src="http://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Weather Icon">
            <span>${temp}°C, ${desc.charAt(0).toUpperCase() + desc.slice(1)}</span>
        `;

        // Detailed Metrics (Phase 8 Updates)
        document.getElementById('humidity').textContent = `${weather.main.humidity}%`;
        document.getElementById('feelsLike').textContent = `${Math.round(weather.main.feels_like)}°`;
        document.getElementById('pressure').textContent = `${weather.main.pressure} hPa`;
        document.getElementById('visibility').textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
        document.getElementById('windSpeed').textContent = `${Math.round(weather.wind.speed * 3.6)} km/s`; // m/s to km/h

        // Sunrise / Sunset
        if (weather.sys && weather.sys.sunrise && weather.sys.sunset) {
            document.getElementById('sunrise').textContent = formatTime(weather.sys.sunrise);
            document.getElementById('sunset').textContent = formatTime(weather.sys.sunset);
        }

        // AQI Logic
        const aqiMap = {
            1: {
                text: "Çok İyi",
                color: "#00e400",
                bg: "linear-gradient(135deg, #11998e, #38ef7d)",
                rec: "Hava kalitesi memnun edici ve hava kirliliği çok az risk taşıyor.",
                textColor: "#ffffff",
                accentColor: "#00d2ff"
            },
            2: {
                text: "İyi",
                color: "#ffff00",
                bg: "linear-gradient(135deg, #fceabb, #f8b500)",
                rec: "Hava kalitesi kabul edilebilir. Ancak, hava kirliliğine karşı çok hassas olan bazı kişiler için risk olabilir.",
                textColor: "#2c3e50", // Dark text for yellow background
                accentColor: "#d35400" // Dark orange accent for contrast
            },
            3: {
                text: "Orta",
                color: "#ff7e00",
                bg: "linear-gradient(135deg, #f12711, #f5af19)",
                rec: "Hassas gruplar için sağlık etkileri oluşabilir. Genel halkın etkilenmesi muhtemel değildir.",
                textColor: "#ffffff",
                accentColor: "#fff"
            },
            4: {
                text: "Kötü",
                color: "#ff0000",
                bg: "linear-gradient(135deg, #cb2d3e, #ef473a)",
                rec: "Herkes sağlık etkileri yaşamaya başlayabilir; hassas gruplar daha ciddi sağlık etkileri yaşayabilir.",
                textColor: "#ffffff",
                accentColor: "#fff"
            },
            5: {
                text: "Çok Kötü",
                color: "#7e0023",
                bg: "linear-gradient(135deg, #8E0E00, #1F1C18)",
                rec: "Acil durum uyarısı. Tüm nüfusun etkilenme olasılığı daha yüksektir.",
                textColor: "#ffffff",
                accentColor: "#00d2ff"
            }
        };

        const status = aqiMap[aqi];

        // Dynamic Colors Update
        document.documentElement.style.setProperty('--text-color', status.textColor);
        document.documentElement.style.setProperty('--accent-color', status.accentColor);

        // Dynamic Background Transition
        document.body.style.background = status.bg;
        document.body.style.backgroundAttachment = "fixed";

        const badge = document.getElementById('aqiBadge');
        badge.textContent = `AQI: ${status.text} (${aqi}/5)`;
        badge.style.backgroundColor = status.color;
        // Text color adjustments for readibility
        badge.style.color = (aqi === 2) ? "#333" : "#fff";

        // Update Components
        document.getElementById('pm25').textContent = components.pm2_5;
        document.getElementById('pm10').textContent = components.pm10;
        document.getElementById('co').textContent = components.co;
        document.getElementById('no2').textContent = components.no2;

        // Update Recommendation
        document.getElementById('recText').textContent = status.rec;

        // Show result
        resultCard.style.display = 'block';

        // Update Forecast and Chart
        updateForecastUI(data.forecast);
        renderChart(data.forecast);

        // Update Risk Groups (Phase 8)
        updateRiskGroups(aqi);

        // Update Activities
        updateActivityGuide(aqi, weather);

        // Update Lifestyle (Phase 6)
        updateLifestyle(temp);

        // Update Alerts (Phase 7)
        checkPrecipitation(data.forecast);

        // Scroll to result
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Activity Guide Logic ---
    function updateActivityGuide(aqi, weather) {
        const activities = {
            'act-sport': { allowed: aqi <= 2, text: "Spor" },
            'act-window': { allowed: aqi <= 3, text: "Havalandırma" },
            'act-mask': { allowed: aqi >= 4, text: "Maske", inverse: true }, // Inverse: Good means wear it? No. Logic needs care.
            // Let's simplify: 
            // Sport: Good if AQI low. 
            // Window: Good if AQI low.
            // Mask: "Recommended" if AQI high. So "Check" means "Yes wear it". "X" means "No need".
            // Picnic: Good if weather is clear AND AQI low.
        };

        // Custom Logic Definitions
        const isRainy = weather.weather[0].main.toLowerCase().includes('rain');

        // 1. Sport (Outdoor)
        setActivityStatus('act-sport', (aqi <= 2 && !isRainy));

        // 2. Ventilation
        setActivityStatus('act-window', (aqi <= 3));

        // 3. Mask (We want "Check" if we SHOULD wear it)
        // Check = Wear Mask (Bad Air). X = No Mask needed (Good Air).
        // So passed condition is "Is Bad Air?"
        setActivityStatus('act-mask', (aqi >= 4));

        // 4. Go Out / Picnic
        setActivityStatus('act-picnic', (aqi <= 2 && !isRainy));
    }

    function setActivityStatus(id, isPositive) {
        const el = document.getElementById(id);
        const icon = el.querySelector('.status-icon');

        // If ID is mask, Positive means "Wear It" (Warning/Action). 
        // For others, Positive means "Allowed/Safe".

        if (id === 'act-mask') {
            if (isPositive) {
                icon.className = 'status-icon fa-solid fa-circle-check status-bad'; // Wear mask!
            } else {
                icon.className = 'status-icon fa-solid fa-circle-xmark status-good'; // No mask needed
            }
        } else {
            if (isPositive) {
                icon.className = 'status-icon fa-solid fa-circle-check status-good'; // Go ahead
            } else {
                icon.className = 'status-icon fa-solid fa-circle-xmark status-bad'; // Don't do it
            }
        }
    }

    // --- Voice Assistant Logic ---
    const voiceBtn = document.getElementById('voiceBtn');

    voiceBtn.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            return;
        }

        const city = document.getElementById('cityName').textContent;
        const temp = document.getElementById('weatherSummary').textContent.replace(/\s+/g, ' ').trim();
        const aqiText = document.getElementById('aqiBadge').textContent;
        const rec = document.getElementById('recText').textContent;

        const textToRead = `Burada hava durumu şuan böyle: ${city}. Sıcaklık ${temp}. Hava kalitesi: ${aqiText}. Önerim: ${rec}`;

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    });

    // --- Share Logic ---
    document.getElementById('shareBtn').addEventListener('click', async () => {
        const city = document.getElementById('cityName').textContent;
        const aqi = document.getElementById('aqiBadge').textContent;
        const temp = document.getElementById('weatherSummary').textContent.trim();

        const shareData = {
            title: 'SkyCheck Hava Raporu',
            text: `SkyCheck Raporu: ${city} şehrinde hava ${temp}. Hava Kalitesi: ${aqi}.`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Paylaşım iptal edildi.", err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareData.text} \n${shareData.url}`);
                alert("Rapor panoya kopyalandı!");
            } catch (err) {
                alert("Kopyalama başarısız oldu.");
            }
        }
    });


    function updateForecastUI(forecastData) {
        if (!forecastData || !forecastData.list) return;

        const forecastListEl = document.getElementById('forecastList');
        forecastListEl.innerHTML = ''; // Clear previous

        // Filter for specific time (e.g., 12:00 PM) to get daily representative
        // Or since it's 3-hour intervals, we can pick every 8th item roughly, 
        // but finding the one closest to noon for each day is safer.

        const dailyData = {};

        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString('tr-TR', { weekday: 'long' });

            // We want roughly noon data
            if (!dailyData[dayKey] && item.dt_txt.includes("12:00:00")) {
                dailyData[dayKey] = item;
            }
        });

        // If we missed "12:00:00" for today (current time passed), fill it? 
        // Actually for simplicity, let's just take unique days.
        // A better approach for 5 days:

        const processedDays = [];
        const seenDays = new Set();

        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });

            if (!seenDays.has(dayName) && item.dt_txt.includes("12:00:00")) {
                seenDays.add(dayName);
                processedDays.push({
                    day: dayName,
                    temp: Math.round(item.main.temp),
                    icon: item.weather[0].icon,
                    desc: item.weather[0].description
                });
            }
        });

        processedDays.forEach(day => {
            const div = document.createElement('div');
            div.className = 'forecast-item';
            div.innerHTML = `
                <span class="f-day">${day.day}</span>
                <img class="f-icon" src="http://openweathermap.org/img/wn/${day.icon}.png" alt="icon">
                <span class="f-desc">${day.desc}</span>
                <span class="f-temp">${day.temp}°C</span>
            `;
            forecastListEl.appendChild(div);
        });
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    // --- Modal Logic ---
    const modal = document.getElementById("aboutModal");
    const infoBtn = document.getElementById("infoBtn");
    const closeBtn = document.getElementsByClassName("close-btn")[0];

    if (infoBtn) {
        infoBtn.onclick = function () {
            modal.style.display = "block";
        }
    }

    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.style.display = "none";
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // --- Phase 6: Lifestyle Logic ---
    function updateLifestyle(temp) {
        const clothIcon = document.getElementById('clothIcon');
        const clothText = document.getElementById('clothText');

        // Simple Logic
        if (temp >= 25) {
            clothIcon.className = "fa-solid fa-shirt"; // T-shirt
            clothText.textContent = "Tișört giy, hava sıcak.";
        } else if (temp >= 15) {
            clothIcon.className = "fa-solid fa-user-tie"; // Casual/Light Jacket
            clothText.textContent = "Hafif bir ceket yeterli.";
        } else if (temp >= 5) {
            clothIcon.className = "fa-solid fa-vest"; // Thick jacket/Vest
            clothText.textContent = "Mont veya kalın giyinmelisin.";
        } else {
            clothIcon.className = "fa-regular fa-snowflake"; // Cold
            clothText.textContent = "Çok soğuk! Sıkı giyin.";
        }

        // Rain overrides? Maybe later. For now temp based is good.
    }

    // Breathing Logic
    const breatheBtn = document.getElementById('breatheBtn');
    const breatheModal = document.getElementById('breathingModal');
    const closeBreathe = document.getElementById('closeBreathe');
    const circle = document.querySelector('.circle');
    const breatheText = document.getElementById('breatheText');
    let breatheInterval;

    if (breatheBtn) {
        breatheBtn.onclick = () => {
            breatheModal.style.display = "block";
            startBreathing();
        };
    }

    if (closeBreathe) {
        closeBreathe.onclick = () => {
            breatheModal.style.display = "none";
            stopBreathing();
        }
    }

    // Close when clicking outside specific container (handled by generic window.onclick logic mostly, but specific here)
    window.addEventListener('click', (e) => {
        if (e.target == breatheModal) {
            breatheModal.style.display = "none";
            stopBreathing();
        }
    });

    function startBreathing() {
        circle.classList.add('circle-grow');
        breatheText.textContent = "Nefes Al...";

        // Sync text with animation (4s inhale, 4s exhale = 8s total)
        // CSS Animation breakdown:
        // 0-40% (3.2s): Grow (Inhale)
        // 40-50% (0.8s): Hold
        // 50-90% (3.2s): Shrink (Exhale)
        // 90-100% (0.8s): Hold/Rest

        let totalTime = 8000;
        let inhaleTime = 3200;
        let holdTime = 800;
        let exhaleTime = 3200;

        const cycle = () => {
            breatheText.textContent = "Nefes Al...";

            setTimeout(() => {
                breatheText.textContent = "Tut...";

                setTimeout(() => {
                    breatheText.textContent = "Nefes Ver...";

                    setTimeout(() => {
                        // End of cycle, loops automatically via setInterval
                    }, exhaleTime);

                }, holdTime);

            }, inhaleTime);
        };

        cycle(); // Start immediately
        breatheInterval = setInterval(cycle, totalTime);
    }

    function stopBreathing() {
        circle.classList.remove('circle-grow');
        clearInterval(breatheInterval);
        breatheText.textContent = "Nefes Al...";
    }

    // Call updateLifestyle inside updateUI
    const originalUpdateUI = updateUI; // Careful with overriding, better to append or just modify existing.
    // Since I can't easily append to middle of function without re-writing it, 
    // I will stick to adding the call at the end of updateUI by replacing the last few lines.


    // --- Phase 7: Forecast Alert Logic ---
    function checkPrecipitation(forecastData) {
        const alertCard = document.getElementById('precipAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertText = document.getElementById('alertText');

        if (!forecastData || !forecastData.list) return;

        // Reset
        alertCard.style.display = 'none';
        alertCard.classList.remove('alert-snow');

        const next24h = forecastData.list.slice(0, 8); // Next 24 hours (8 * 3hr)

        let rainTimes = [];
        let snowTimes = [];

        next24h.forEach(item => {
            const condition = item.weather[0].main.toLowerCase();
            const timeStr = item.dt_txt.split(' ')[1].substring(0, 5); // "15:00"

            if (condition.includes('rain')) {
                rainTimes.push(timeStr);
            } else if (condition.includes('snow')) {
                snowTimes.push(timeStr);
            }
        });

        if (snowTimes.length > 0) {
            // Priority to Snow
            alertCard.style.display = 'flex';
            alertCard.classList.add('alert-snow');
            alertIcon.className = "fa-solid fa-snowflake";
            alertIcon.style.color = "#333"; // Dark icon for snow

            const timeRange = formatTimeRange(snowTimes);
            alertText.textContent = `Dikkat: Bugün ${timeRange} saatleri arasında kar yağışı bekleniyor.`;

        } else if (rainTimes.length > 0) {
            alertCard.style.display = 'flex';
            alertIcon.className = "fa-solid fa-umbrella";
            alertIcon.style.color = "#fff";

            const timeRange = formatTimeRange(rainTimes);
            alertText.textContent = `Dikkat: Bugün ${timeRange} saatleri arasında yağmur bekleniyor.`;
        }
    }

    function formatTimeRange(times) {
        if (times.length === 0) return "";
        if (times.length === 1) return times[0];

        // Simple "start - end" if continuous, or just list.
        // For simplicity, showing first and last if many, or strictly listing key ones.
        // Let's show "12:00 - 18:00" if sequential, but forecast items are sequential.
        // If we have [12:00, 15:00, 18:00], we say "12:00 - 18:00".

        const first = times[0];
        const last = times[times.length - 1];

        if (first === last) return first;
        return `${first} - ${last}`;
    }

    // --- Phase 8: Risk Groups Logic ---
    function updateRiskGroups(aqi) {
        // Definitions: 1=Low, 2=Low/Mod, 3=Mod(Sensitive), 4=High, 5=Very High

        const setRisk = (id, level) => {
            const card = document.getElementById(id);
            const tag = card.querySelector('.risk-tag');

            // Reset classes
            card.classList.remove('risk-low', 'risk-moderate', 'risk-high', 'risk-very-high');

            if (level === 1) { // Low
                card.classList.add('risk-low');
                tag.textContent = "Düşük";
            } else if (level === 2) { // Moderate
                card.classList.add('risk-moderate');
                tag.textContent = "Orta";
            } else if (level === 3) { // High
                card.classList.add('risk-high');
                tag.textContent = "Yüksek";
            } else { // Very High
                card.classList.add('risk-very-high');
                tag.textContent = "Çok Yüksek";
            }
        };

        // Logic Mapping based on standard AQI health recommendations
        // AQI 1 (Good): All Low
        // AQI 2 (Fair): Sensitive groups Low/Mod, General Low
        // AQI 3 (Moderate): Sensitive Moderate/High, General Low/Mod
        // AQI 4 (Poor): Sensitive High, General Moderate/High
        // AQI 5 (Very Poor): All High/Very High

        if (aqi <= 1) {
            setRisk('risk-sensitive', 1);
            setRisk('risk-children', 1);
            setRisk('risk-elderly', 1);
            setRisk('risk-general', 1);
        } else if (aqi === 2) {
            setRisk('risk-sensitive', 2); // Caution
            setRisk('risk-children', 2);
            setRisk('risk-elderly', 2);
            setRisk('risk-general', 1);
        } else if (aqi === 3) {
            setRisk('risk-sensitive', 3); // High Risk for them
            setRisk('risk-children', 3);
            setRisk('risk-elderly', 3);
            setRisk('risk-general', 2);
        } else if (aqi === 4) {
            setRisk('risk-sensitive', 4);
            setRisk('risk-children', 4);
            setRisk('risk-elderly', 4);
            setRisk('risk-general', 3);
        } else {
            setRisk('risk-sensitive', 4);
            setRisk('risk-children', 4);
            setRisk('risk-elderly', 4);
            setRisk('risk-general', 4);
        }
    }

    // Call checkPrecipitation inside updateUI
    // I need to hook this into updateUI.

    // Since I can't easily edit middle of updateUI, I will assume the previous updateLifestyle call exists
    // and I'll instruct the USER or re-apply updateUI completely if needed.
    // Or I find where updateLifestyle is called and add this next to it?
    // I will append it to the end of file, but I MUST call it.
    // I will modify updateUI once more to add this call.

});
