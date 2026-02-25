import React from 'react';
import {AbsoluteFill, Video} from 'remotion';
import type {CaptionSegment, CaptionStyle} from './types';
import {CaptionsOverlay} from './CaptionsOverlay';

export const CaptionedVideo: React.FC<{
  videoSrc?: string;
  backgroundColor?: string;
  captions: CaptionSegment[];
  captionStyle?: CaptionStyle;
}> = ({videoSrc, backgroundColor = '#000', captions, captionStyle}) => {
  return (
    <AbsoluteFill style={{backgroundColor}}>
      {videoSrc ? (
        <Video
          src={videoSrc}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      ) : null}
      <CaptionsOverlay captions={captions} style={captionStyle} />
    </AbsoluteFill>
  );
};
