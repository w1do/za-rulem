import { chatCities } from '../../../data/cities';
import type { ChatTopic } from '../model/types';
import { chatChannels } from './channels';

interface ChatAsideProps {
	phone: string;
	city: string;
	topic: ChatTopic;
	onSelectCity: (city: string) => void;
	onSelectTopic: (topic: ChatTopic) => void;
}

const getInitials = (phone: string): string => {
	const digits = phone.replace(/\D/g, '');
	return digits ? digits.slice(-2) : 'Я';
};

export default function ChatAside({ phone, city, topic, onSelectCity, onSelectTopic }: ChatAsideProps) {
	return (
		<aside className="dc-aside">
			<div className="dc-aside__profile">
				<span className="dc-avatar dc-avatar--lg">{getInitials(phone)}</span>
				<div className="dc-aside__profile-body">
					<strong>{phone || 'Гость'}</strong>
					<span className="dc-status"><i></i> на связи</span>
				</div>
			</div>

			<span className="dc-aside__label">Город</span>
			<select
				className="form-control dc-city"
				aria-label="Город"
				value={city}
				onChange={(event) => onSelectCity(event.target.value)}
			>
				{chatCities.map((item) => (
					<option key={item.slug} value={item.slug}>
						{item.name}
					</option>
				))}
			</select>

			<span className="dc-aside__label">Каналы топлива</span>
			<div className="dc-channels" role="tablist" aria-label="Каналы чата">
				{chatChannels.map((channel) => (
					<button
						type="button"
						key={channel.id}
						role="tab"
						aria-selected={channel.id === topic}
						className={`dc-channel${channel.id === topic ? ' is-active' : ''}`}
						onClick={() => onSelectTopic(channel.id)}
					>
						<span className="dc-channel__icon"><i className={`fa-solid ${channel.icon}`}></i></span>
						<span className="dc-channel__body">
							<strong>{channel.title}</strong>
							<span>{channel.hint}</span>
						</span>
					</button>
				))}
			</div>

			<a className="dc-aside__cta btn-default" href="/chat">
				<i className="fa-solid fa-mobile-screen-button"></i> приложение
			</a>
		</aside>
	);
}
