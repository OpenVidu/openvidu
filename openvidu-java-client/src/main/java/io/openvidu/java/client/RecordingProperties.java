/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.java.client;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.google.gson.JsonObject;

import io.openvidu.java.client.Recording.OutputMode;

/**
 * See
 * {@link io.openvidu.java.client.OpenVidu#startRecording(String, RecordingProperties)}
 */
public class RecordingProperties {

	public static class DefaultValues {
		public static final String name = "";
		public static final Boolean hasAudio = true;
		public static final Boolean hasVideo = true;
		public static final Recording.OutputMode outputMode = Recording.OutputMode.COMPOSED;
		public static final RecordingLayout recordingLayout = RecordingLayout.BEST_FIT;
		public static final String resolution = "1280x720";
		public static final Integer frameRate = 25;
		public static final Long shmSize = 536870912L;
		public static final String customLayout = "";
		public static final Boolean ignoreFailedStreams = false;
	}

	// For all
	private String name = DefaultValues.name;
	private Boolean hasAudio = DefaultValues.hasAudio;
	private Boolean hasVideo = DefaultValues.hasVideo;
	private Recording.OutputMode outputMode = DefaultValues.outputMode;
	// For COMPOSED/COMPOSED_QUICK_START + hasVideo
	private RecordingLayout recordingLayout;
	private String resolution;
	private Integer frameRate;
	private Long shmSize;
	// For COMPOSED/COMPOSED_QUICK_START + hasVideo + RecordingLayout.CUSTOM
	private String customLayout;
	// For INDIVIDUAL
	private Boolean ignoreFailedStreams;
	// For OpenVidu Pro
	private String mediaNode;

	/**
	 * Builder for {@link io.openvidu.java.client.RecordingProperties}
	 */
	public static class Builder {

		private String name = DefaultValues.name;
		private Boolean hasAudio = DefaultValues.hasAudio;
		private Boolean hasVideo = DefaultValues.hasVideo;
		private Recording.OutputMode outputMode = DefaultValues.outputMode;
		private RecordingLayout recordingLayout = DefaultValues.recordingLayout;
		private String resolution = DefaultValues.resolution;
		private Integer frameRate = DefaultValues.frameRate;
		private Long shmSize = DefaultValues.shmSize;
		private String customLayout = DefaultValues.customLayout;
		private Boolean ignoreFailedStreams = DefaultValues.ignoreFailedStreams;
		private String mediaNode;

		public Builder() {
		}

		public Builder(RecordingProperties props) {
			this.name = props.name();
			this.hasAudio = props.hasAudio();
			this.hasVideo = props.hasVideo();
			this.outputMode = props.outputMode();
			this.recordingLayout = props.recordingLayout();
			this.resolution = props.resolution();
			this.frameRate = props.frameRate();
			this.shmSize = props.shmSize();
			this.customLayout = props.customLayout();
			this.ignoreFailedStreams = props.ignoreFailedStreams();
			this.mediaNode = props.mediaNode();
		}

		/**
		 * Builder for {@link io.openvidu.java.client.RecordingProperties}
		 */
		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.hasAudio, this.hasVideo, this.outputMode,
					this.recordingLayout, this.resolution, this.frameRate, this.shmSize, this.customLayout,
					this.ignoreFailedStreams, this.mediaNode);
		}

		/**
		 * Call this method to set the name of the video file
		 */
		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}

		/**
		 * Call this method to specify whether to record audio or not. Cannot be set to
		 * false at the same time as
		 * {@link RecordingProperties.Builder#hasVideo(boolean)}
		 */
		public RecordingProperties.Builder hasAudio(boolean hasAudio) {
			this.hasAudio = hasAudio;
			return this;
		}

		/**
		 * Call this method to specify whether to record video or not. Cannot be set to
		 * false at the same time as
		 * {@link RecordingProperties.Builder#hasAudio(boolean)}
		 */
		public RecordingProperties.Builder hasVideo(boolean hasVideo) {
			this.hasVideo = hasVideo;
			return this;
		}

		/**
		 * Call this method to set the mode of recording:
		 * {@link Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} for
		 * a single archive in a grid layout or {@link Recording.OutputMode#INDIVIDUAL}
		 * for one archive for each stream.
		 */
		public RecordingProperties.Builder outputMode(Recording.OutputMode outputMode) {
			this.outputMode = outputMode;
			return this;
		}

		/**
		 * Call this method to set the layout to be used in the recording. Will only
		 * have effect for {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED}
		 * or {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
		 * recordings with {@link RecordingProperties#hasVideo()} to true.
		 */
		public RecordingProperties.Builder recordingLayout(RecordingLayout layout) {
			this.recordingLayout = layout;
			return this;
		}

		/**
		 * Call this method to specify the recording resolution. Must be a string with
		 * format "WIDTHxHEIGHT", being both WIDTH and HEIGHT the number of pixels
		 * between 100 and 1999.<br>
		 * Will only have effect for
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
		 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
		 * ignored for INDIVIDUAL recordings and audio-only recordings. For
		 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
		 * individual video files will have the native resolution of the published
		 * stream.
		 */
		public RecordingProperties.Builder resolution(String resolution) {
			this.resolution = resolution;
			return this;
		}

		/**
		 * Call this method to specify the recording frame rate. Will only have effect
		 * for {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
		 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
		 * ignored for INDIVIDUAL recordings and audio-only recordings. For
		 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
		 * individual video files will have the native frame rate of the published
		 * stream.
		 */
		public RecordingProperties.Builder frameRate(int frameRate) {
			this.frameRate = frameRate;
			return this;
		}

		/**
		 * Call this method to specify the amount of shared memory reserved for the
		 * recording process in bytes. Minimum 134217728 (128MB).<br>
		 * Will only have effect for
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
		 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
		 * ignored for INDIVIDUAL recordings and audio-only recordings
		 */
		public RecordingProperties.Builder shmSize(long shmSize) {
			this.shmSize = shmSize;
			return this;
		}

		/**
		 * If setting
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#recordingLayout(RecordingLayout)}
		 * to {@link io.openvidu.java.client.RecordingLayout#CUSTOM} you can call this
		 * method to set the relative path to the specific custom layout you want to
		 * use.<br>
		 * See <a href=
		 * "https://docs.openvidu.io/en/stable/advanced-features/recording#custom-recording-layouts">
		 * Custom recording layouts </a> to learn more
		 */
		public RecordingProperties.Builder customLayout(String path) {
			this.customLayout = path;
			return this;
		}

		/**
		 * Call this method to specify whether to ignore failed streams or not when
		 * starting the recording. This property only applies to
		 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} recordings.
		 * For this type of recordings, when calling
		 * {@link io.openvidu.java.client.OpenVidu#startRecording(String, RecordingProperties)}
		 * by default all the streams available at the moment the recording process
		 * starts must be healthy and properly sending media. If some stream that should
		 * be sending media is broken, then the recording process fails after a 10s
		 * timeout. In this way your application is notified that some stream is not
		 * being recorded, so it can retry the process again. But you can disable this
		 * rollback behavior and simply ignore any failed stream, which will be
		 * susceptible to be recorded in the future if media starts flowing as expected
		 * at any point. The downside of this behavior is that you will have no
		 * guarantee that all streams present at the beginning of a recording are
		 * actually being recorded.
		 */
		public RecordingProperties.Builder ignoreFailedStreams(boolean ignoreFailedStreams) {
			this.ignoreFailedStreams = ignoreFailedStreams;
			return this;
		}

		/**
		 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display:
		 * inline-block; background-color: rgb(0, 136, 170); color: white; font-weight:
		 * bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size:
		 * 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> Call
		 * this method to force the recording to be hosted in the Media Node with
		 * identifier <code>mediaNodeId</code>. This property only applies to
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
		 * recordings with {@link RecordingProperties#hasVideo()} to true and is ignored
		 * for {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL}
		 * recordings and audio-only recordings, that are always hosted in the same
		 * Media Node hosting its Session
		 */
		public RecordingProperties.Builder mediaNode(String mediaNodeId) {
			this.mediaNode = mediaNodeId;
			return this;
		}

	}

	protected RecordingProperties(String name, Boolean hasAudio, Boolean hasVideo, Recording.OutputMode outputMode,
			RecordingLayout layout, String resolution, Integer frameRate, Long shmSize, String customLayout,
			Boolean ignoreFailedStreams, String mediaNode) {
		this.name = name != null ? name : DefaultValues.name;
		this.hasAudio = hasAudio != null ? hasAudio : DefaultValues.hasAudio;
		this.hasVideo = hasVideo != null ? hasVideo : DefaultValues.hasVideo;
		this.outputMode = outputMode != null ? outputMode : DefaultValues.outputMode;
		if ((OutputMode.COMPOSED.equals(this.outputMode) || OutputMode.COMPOSED_QUICK_START.equals(this.outputMode))
				&& this.hasVideo) {
			this.recordingLayout = layout != null ? layout : DefaultValues.recordingLayout;
			this.resolution = resolution != null ? resolution : DefaultValues.resolution;
			this.frameRate = frameRate != null ? frameRate : DefaultValues.frameRate;
			this.shmSize = shmSize != null ? shmSize : DefaultValues.shmSize;
			if (RecordingLayout.CUSTOM.equals(this.recordingLayout)) {
				this.customLayout = customLayout;
			}
		}
		if (OutputMode.INDIVIDUAL.equals(this.outputMode)) {
			this.ignoreFailedStreams = ignoreFailedStreams;
		}
		this.mediaNode = mediaNode;
	}

	/**
	 * Defines the name you want to give to the video file
	 */
	public String name() {
		return this.name;
	}

	/**
	 * Defines whether to record audio or not. Cannot be set to false at the same
	 * time as {@link RecordingProperties#hasVideo()}.<br>
	 * <br>
	 *
	 * Default to true
	 */
	public Boolean hasAudio() {
		return this.hasAudio;
	}

	/**
	 * Defines whether to record video or not. Cannot be set to false at the same
	 * time as {@link RecordingProperties#hasAudio()}.<br>
	 * <br>
	 *
	 * Default to true
	 */
	public Boolean hasVideo() {
		return this.hasVideo;
	}

	/**
	 * Defines the mode of recording: {@link Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} for
	 * a single archive in a grid layout or {@link Recording.OutputMode#INDIVIDUAL}
	 * for one archive for each stream.<br>
	 * <br>
	 *
	 * Default to {@link Recording.OutputMode#COMPOSED OutputMode.COMPOSED}
	 */
	public Recording.OutputMode outputMode() {
		return this.outputMode;
	}

	/**
	 * Defines the layout to be used in the recording.<br>
	 * Will only have effect for
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
	 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
	 * ignored for INDIVIDUAL recordings and audio-only recordings<br>
	 * <br>
	 *
	 * Default to {@link RecordingLayout#BEST_FIT RecordingLayout.BEST_FIT}
	 */
	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

	/**
	 * Defines the resolution of the recorded video.<br>
	 * Will only have effect for
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
	 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
	 * ignored for INDIVIDUAL recordings and audio-only recordings. For
	 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
	 * individual video files will have the native resolution of the published
	 * stream.<br>
	 * <br>
	 *
	 * Default to "1280x720"
	 */
	public String resolution() {
		return this.resolution;
	}

	/**
	 * Defines the frame rate of the recorded video.<br>
	 * Will only have effect for
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
	 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
	 * ignored for INDIVIDUAL recordings and audio-only recordings. For
	 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
	 * individual video files will have the native frame rate of the published
	 * stream.<br>
	 * <br>
	 *
	 * Default to 25
	 */
	public Integer frameRate() {
		return this.frameRate;
	}

	/**
	 * The amount of shared memory reserved for the recording process in bytes.
	 * Minimum 134217728 (128MB).<br>
	 * Will only have effect for
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
	 * recordings with {@link RecordingProperties#hasVideo()} to true. Property
	 * ignored for INDIVIDUAL recordings and audio-only recordings<br>
	 * <br>
	 *
	 * Default to 536870912 (512 MB)
	 */
	public Long shmSize() {
		return this.shmSize;
	}

	/**
	 * If {@link io.openvidu.java.client.RecordingProperties#recordingLayout()} is
	 * set to {@link io.openvidu.java.client.RecordingLayout#CUSTOM}, this property
	 * defines the relative path to the specific custom layout you want to use.<br>
	 * See <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording#custom-recording-layouts">
	 * Custom recording layouts </a> to learn more
	 */
	public String customLayout() {
		return this.customLayout;
	}

	/**
	 * Defines whether to ignore failed streams or not when starting the recording.
	 * This property only applies to
	 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} recordings.
	 * For this type of recordings, when calling
	 * {@link io.openvidu.java.client.OpenVidu#startRecording(String, RecordingProperties)}
	 * by default all the streams available at the moment the recording process
	 * starts must be healthy and properly sending media. If some stream that should
	 * be sending media is broken, then the recording process fails after a 10s
	 * timeout. In this way your application is notified that some stream is not
	 * being recorded, so it can retry the process again. But you can disable this
	 * rollback behavior and simply ignore any failed stream, which will be
	 * susceptible to be recorded in the future if media starts flowing as expected
	 * at any point. The downside of this behavior is that you will have no
	 * guarantee that all streams present at the beginning of a recording are
	 * actually being recorded.<br>
	 * <br>
	 *
	 * Default to false
	 */
	public Boolean ignoreFailedStreams() {
		return this.ignoreFailedStreams;
	}

	/**
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display:
	 * inline-block; background-color: rgb(0, 136, 170); color: white; font-weight:
	 * bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size:
	 * 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> The
	 * Media Node where to host the recording. The default option if this property
	 * is not defined is the same Media Node hosting the Session to record. This
	 * property only applies to COMPOSED or COMPOSED_QUICK_START recordings with
	 * {@link RecordingProperties#hasVideo()} to true and is ignored for INDIVIDUAL
	 * recordings and audio-only recordings
	 */
	public String mediaNode() {
		return this.mediaNode;
	}

	/**
	 * @hidden
	 */
	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("name", name != null ? name : DefaultValues.name);
		json.addProperty("hasAudio", hasAudio != null ? hasAudio : DefaultValues.hasAudio);
		json.addProperty("hasVideo", hasVideo != null ? hasVideo : DefaultValues.hasVideo);
		json.addProperty("outputMode", outputMode != null ? outputMode.name() : DefaultValues.outputMode.name());
		if ((OutputMode.COMPOSED.equals(outputMode) || OutputMode.COMPOSED_QUICK_START.equals(outputMode))
				&& hasVideo) {
			json.addProperty("recordingLayout",
					recordingLayout != null ? recordingLayout.name() : DefaultValues.recordingLayout.name());
			json.addProperty("resolution", resolution != null ? resolution : DefaultValues.resolution);
			json.addProperty("frameRate", frameRate != null ? frameRate : DefaultValues.frameRate);
			json.addProperty("shmSize", shmSize != null ? shmSize : DefaultValues.shmSize);
			if (RecordingLayout.CUSTOM.equals(recordingLayout)) {
				json.addProperty("customLayout", customLayout != null ? customLayout : DefaultValues.customLayout);
			}
		}
		if (OutputMode.INDIVIDUAL.equals(outputMode)) {
			json.addProperty("ignoreFailedStreams",
					ignoreFailedStreams != null ? ignoreFailedStreams : DefaultValues.ignoreFailedStreams);
		}
		if (this.mediaNode != null) {
			json.addProperty("mediaNode", mediaNode);
		}
		return json;
	}

	/**
	 * @hidden
	 */
	public static RecordingProperties.Builder fromJson(Map<String, ?> params, RecordingProperties defaultProps)
			throws RuntimeException {

		// Final properties being used
		String nameFinal = null;
		Boolean hasAudioFinal = null;
		Boolean hasVideoFinal = null;
		OutputMode outputModeFinal = null;
		RecordingLayout recordingLayoutFinal = null;
		String resolutionFinal = null;
		Integer frameRateFinal = null;
		Long shmSizeFinal = null;
		String customLayoutFinal = null;
		Boolean ignoreFailedStreamsFinal = null;

		// Defaults properties
		String nameDefault = null;
		Boolean hasAudioDefault = null;
		Boolean hasVideoDefault = null;
		OutputMode outputModeDefault = null;
		RecordingLayout recordingLayoutDefault = null;
		String resolutionDefault = null;
		Integer frameRateDefault = null;
		Long shmSizeDefault = null;
		String customLayoutDefault = null;
		Boolean ignoreFailedStreamsDefault = null;
		String mediaNodeDefault = null;

		if (defaultProps != null) {
			nameDefault = defaultProps.name();
			hasAudioDefault = defaultProps.hasAudio();
			hasVideoDefault = defaultProps.hasVideo();
			outputModeDefault = defaultProps.outputMode();
			recordingLayoutDefault = defaultProps.recordingLayout();
			resolutionDefault = defaultProps.resolution();
			frameRateDefault = defaultProps.frameRate();
			shmSizeDefault = defaultProps.shmSize();
			customLayoutDefault = defaultProps.customLayout();
			ignoreFailedStreamsDefault = defaultProps.ignoreFailedStreams();
			mediaNodeDefault = defaultProps.mediaNode();
		}

		nameDefault = nameDefault != null ? nameDefault : DefaultValues.name;
		hasAudioDefault = hasAudioDefault != null ? hasAudioDefault : DefaultValues.hasAudio;
		hasVideoDefault = hasVideoDefault != null ? hasVideoDefault : DefaultValues.hasVideo;
		outputModeDefault = outputModeDefault != null ? outputModeDefault : DefaultValues.outputMode;
		recordingLayoutDefault = recordingLayoutDefault != null ? recordingLayoutDefault
				: DefaultValues.recordingLayout;
		resolutionDefault = resolutionDefault != null ? resolutionDefault : DefaultValues.resolution;
		frameRateDefault = frameRateDefault != null ? frameRateDefault : DefaultValues.frameRate;
		shmSizeDefault = shmSizeDefault != null ? shmSizeDefault : DefaultValues.shmSize;
		customLayoutDefault = customLayoutDefault != null ? customLayoutDefault : DefaultValues.customLayout;
		ignoreFailedStreamsDefault = ignoreFailedStreamsDefault != null ? ignoreFailedStreamsDefault
				: DefaultValues.ignoreFailedStreams;

		// Provided properties through params
		String nameParam;
		Boolean hasAudioParam;
		Boolean hasVideoParam;
		String outputModeStringParam;
		String recordingLayoutStringParam;
		String resolutionParam;
		Number frameRateParam;
		Long shmSizeParam = null;
		String customLayoutParam;
		Boolean ignoreFailedStreamsParam;

		try {
			String session = (String) params.get("session");
			nameParam = (String) params.get("name");
			hasAudioParam = (Boolean) params.get("hasAudio");
			hasVideoParam = (Boolean) params.get("hasVideo");
			outputModeStringParam = (String) params.get("outputMode");
			recordingLayoutStringParam = (String) params.get("recordingLayout");
			resolutionParam = (String) params.get("resolution");
			frameRateParam = (Number) params.get("frameRate");
			if (params.get("shmSize") != null) {
				Number shmSize = (Number) params.get("shmSize");
				shmSizeParam = shmSize.longValue();
			}
			customLayoutParam = (String) params.get("customLayout");
			ignoreFailedStreamsParam = (Boolean) params.get("ignoreFailedStreams");
		} catch (ClassCastException | NumberFormatException e) {
			throw new IllegalArgumentException("Type error in some parameter: " + e.getMessage());
		}

		if (nameParam != null && !nameParam.isEmpty()) {
			if (!Utils.isValidRecordingName(nameParam)) {
				throw new IllegalArgumentException(
						"Parameter 'name' is wrong. Must be an alphanumeric string [a-zA-Z0-9_-~]+");
			}
			nameFinal = nameParam;
		} else {
			nameFinal = nameDefault;
		}

		if (hasAudioParam != null) {
			hasAudioFinal = hasAudioParam;
		} else {
			hasAudioFinal = hasAudioDefault;
		}

		if (hasVideoParam != null) {
			hasVideoFinal = hasVideoParam;
		} else {
			hasVideoFinal = hasVideoDefault;
		}

		if (!hasAudioFinal && !hasVideoFinal) {
			// Cannot start a recording with both "hasAudio" and "hasVideo" to false
			throw new IllegalStateException(
					"Cannot start a recording with both \"hasAudio\" and \"hasVideo\" set to false");
		}

		if (outputModeStringParam != null) {
			try {
				outputModeFinal = OutputMode.valueOf(outputModeStringParam);

				// If param outputMode is COMPOSED when default is COMPOSED_QUICK_START,
				// change outputMode to COMPOSED_QUICK_START (and vice versa)
				if (defaultProps != null && OutputMode.COMPOSED_QUICK_START.equals(defaultProps.outputMode())
						&& OutputMode.COMPOSED.equals(outputModeFinal)) {
					outputModeFinal = OutputMode.COMPOSED_QUICK_START;
				} else if (defaultProps != null && OutputMode.COMPOSED.equals(defaultProps.outputMode())
						&& OutputMode.COMPOSED_QUICK_START.equals(outputModeFinal)) {
					outputModeFinal = OutputMode.COMPOSED;
				}

			} catch (Exception e) {
				throw new IllegalArgumentException("Type error in parameter 'outputMode'");
			}
		} else {
			outputModeFinal = outputModeDefault;
		}

		if (IS_COMPOSED(outputModeFinal)) {

			if (recordingLayoutStringParam != null) {
				try {
					recordingLayoutFinal = RecordingLayout.valueOf(recordingLayoutStringParam);
				} catch (Exception e) {
					throw new IllegalArgumentException("Type error in parameter 'recordingLayout'");
				}
			} else {
				recordingLayoutFinal = recordingLayoutDefault;
			}

			if (resolutionParam != null) {
				if (!Utils.isAcceptableRecordingResolution(resolutionParam)) {
					throw new IllegalStateException(
							"Wrong 'resolution' parameter. Acceptable values from 100 to 1999 for both width and height");
				}
				resolutionFinal = resolutionParam;
			} else {
				resolutionFinal = resolutionDefault;
			}

			if (frameRateParam != null) {
				if (!Utils.isAcceptableRecordingFrameRate(frameRateParam.intValue())) {
					throw new IllegalStateException(
							"Wrong 'frameRate' parameter. Acceptable values are within range [1,120]");
				}
				frameRateFinal = frameRateParam.intValue();
			} else {
				frameRateFinal = frameRateDefault;
			}

			if (shmSizeParam != null) {
				if (!Utils.isAcceptableRecordingShmSize(shmSizeParam)) {
					throw new IllegalStateException("Wrong 'shmSize' parameter. Must be 134217728 (128 MB) minimum");
				}
				shmSizeFinal = shmSizeParam;
			} else {
				shmSizeFinal = shmSizeDefault;
			}

			if (RecordingLayout.CUSTOM.equals(recordingLayoutFinal)) {
				if (customLayoutParam != null) {
					customLayoutFinal = customLayoutParam;
				} else {
					customLayoutFinal = customLayoutDefault;
				}
			}
		} else if (OutputMode.INDIVIDUAL.equals(outputModeFinal)) {
			if (ignoreFailedStreamsParam != null) {
				ignoreFailedStreamsFinal = ignoreFailedStreamsParam;
			} else {
				ignoreFailedStreamsFinal = ignoreFailedStreamsDefault;
			}
		}

		RecordingProperties.Builder builder = new RecordingProperties.Builder();
		builder.name(nameFinal).hasAudio(hasAudioFinal).hasVideo(hasVideoFinal).outputMode(outputModeFinal);
		if (IS_COMPOSED(outputModeFinal) && hasVideoFinal) {
			builder.recordingLayout(recordingLayoutFinal);
			builder.resolution(resolutionFinal);
			builder.frameRate(frameRateFinal);
			builder.shmSize(shmSizeFinal);
			if (RecordingLayout.CUSTOM.equals(recordingLayoutFinal)) {
				builder.customLayout(customLayoutFinal);
			}
		}
		if (OutputMode.INDIVIDUAL.equals(outputModeFinal)) {
			builder.ignoreFailedStreams(ignoreFailedStreamsFinal);
		}

		if (IS_COMPOSED(outputModeFinal)) {
			if (mediaNodeDefault == null) {
				try {
					mediaNodeDefault = SessionProperties.getMediaNodeProperty(params);
				} catch (IllegalArgumentException e) {
					// Not a json object
					if (params.containsKey("mediaNode")) {
						try {
							mediaNodeDefault = (String) params.get("mediaNode");
						} catch (Exception e2) {
							throw new IllegalArgumentException("Wrong 'mediaNode' parameter. Wrong type");
						}
					}
				}
			}
			if (mediaNodeDefault != null && !mediaNodeDefault.isEmpty()) {
				builder.mediaNode = mediaNodeDefault;
			}
		}

		return builder;
	}

	/**
	 * @hidden
	 */
	public final static boolean IS_COMPOSED(OutputMode outputMode) {
		return (OutputMode.COMPOSED.equals(outputMode) || OutputMode.COMPOSED_QUICK_START.equals(outputMode));
	}

	/**
	 * @hidden
	 */
	public final static Map<String, ?> removeNonBroadcastProperties(Map<String, ?> params) {
		List<String> nonBroadcastProps = Arrays.asList(new String[] { "outputMode", "name", "ignoreFailedStreams" });
		nonBroadcastProps.forEach(p -> params.remove(p));
		return params;
	}

}
