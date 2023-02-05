import './mini-song-info.scss';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

export function MiniSongInfo(props) {
	const [title, setTitle] = useState('');
	const [artist, setArtist] = useState('');
	const [album, setAlbum] = useState('');

	const image = props.image;

	useEffect(() => {
		const observer = new MutationObserver(() => {
			if (image.src === album) return;
			if (image.complete) {
				setAlbum(image.src);
			}
		});
		observer.observe(image, { attributes: true, attributeFilter: ['src'] });
		const onload = () => {
			setAlbum(image.src);
		};
		image.addEventListener('load', onload);
		return () => {
			observer.disconnect();
			image.removeEventListener('load', onload);
		}
	}, [image]);

	const infContainer = props.infContainer;
	useEffect(() => {
		const onObverse = () => {
			const title = infContainer.querySelector('.title .name').textContent.trim();
			const artist = Array.from(infContainer.querySelectorAll('.info .playfrom > li:first-child a')).map(a => a.textContent.trim()).join(' / ');
			setTitle(title);
			setArtist(artist);
		};
		onObverse();
		const observer = new MutationObserver(() => {
			onObverse();
		});
		observer.observe(infContainer, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
		}
	} , [infContainer]);

	return (
		<>
			<div className="album">
				<img src={album} alt="" />
			</div>
			<div className="info">
				<div className="title">{title}</div>
				<div className="artist">{artist}</div>
			</div>
		</>
	);
}