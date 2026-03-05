"use client";

export default function RefreshButton() {
    const handleRefresh = () => {
        // Clear cache hints if possible and hard reload
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }

        // Clear storage that might affect view if needed, 
        // but keep admin_password to avoid logging out the user
        // sessionStorage.clear(); 

        window.location.reload();
    };

    return (
        <button
            onClick={handleRefresh}
            className="global-refresh-btn"
            aria-label="Actualizar aplicación"
            title="Actualizar y limpiar caché"
        >
            🔄
            <span className="refresh-tooltip">Actualizar Versión</span>
        </button>
    );
}
