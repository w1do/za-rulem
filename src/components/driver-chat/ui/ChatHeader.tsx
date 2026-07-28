import type { ChatChannel } from './channels';

interface ChatHeaderProps {
	channel: ChatChannel;
	cityName: string;
	showDownload: boolean;
	onToggleAside: () => void;
}

const openAboutModal = () => {
	(document.getElementById('chat-about-modal') as HTMLDialogElement | null)?.showModal();
};

export default function ChatHeader({ channel, cityName, showDownload, onToggleAside }: ChatHeaderProps) {
	return (
		<header className="dc-main__head">
			<button
				type="button"
				className="dc-main__toggle"
				aria-label="Показать каналы"
				onClick={onToggleAside}
			>
				<i className="fa-solid fa-bars"></i>
			</button>
			<span className="dc-avatar"><i className={`fa-solid ${channel.icon}`}></i></span>
			<div className="dc-main__title">
				<strong>{channel.title}</strong>
				<span className="dc-status dc-status--muted">
					<i></i> {cityName} · сообщения обновляются автоматически
				</span>
			</div>
			{showDownload && (
				<button type="button" className="dc-main__download" onClick={openAboutModal}>
					<i className="fa-solid fa-mobile-screen-button"></i>
					<span>Скачать</span>
				</button>
			)}
		</header>
	);
}
