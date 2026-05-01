import type { LoadGuessVideo as LoadGuessVideoType } from "@/lib/loadguess/types";

type LoadGuessVideoProps = {
  video: LoadGuessVideoType;
};

export function LoadGuessVideo({ video }: LoadGuessVideoProps) {
  return (
    <section
      key={video.id}
      className="loadguess-video"
      aria-labelledby="loadguess-video-title"
    >
      <div className="loadguess-video__frame">
        <video
          key={video.id}
          className="loadguess-video__player"
          controls
          playsInline
          preload="metadata"
          poster={video.posterUrl}
        >
          <source src={video.blurredVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="loadguess-video__meta">
        <h2 id="loadguess-video-title" className="loadguess-video__title">
          {video.title}
        </h2>
        <p className="loadguess-video__exercise">{video.exercise}</p>
      </div>
    </section>
  );
}
