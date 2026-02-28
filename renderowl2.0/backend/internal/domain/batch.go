package domain

import "time"

// Batch represents a batch video generation job
type Batch struct {
	ID          string                 `json:"id"`
	UserID      string                 `json:"userId"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Status      BatchStatus            `json:"status"`
	TotalVideos int                    `json:"totalVideos"`
	Completed   int                    `json:"completed"`
	Failed      int                    `json:"failed"`
	InProgress  int                    `json:"inProgress"`
	Videos      []BatchVideo           `json:"videos"`
	Config      BatchConfig            `json:"config"`
	Progress    float64                `json:"progress"`
	Error       string                 `json:"error,omitempty"`
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
	StartedAt   *time.Time             `json:"startedAt,omitempty"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// BatchStatus represents the status of a batch job
type BatchStatus string

const (
	BatchStatusPending    BatchStatus = "pending"
	BatchStatusQueued     BatchStatus = "queued"
	BatchStatusProcessing BatchStatus = "processing"
	BatchStatusCompleted  BatchStatus = "completed"
	BatchStatusFailed     BatchStatus = "failed"
	BatchStatusCancelled  BatchStatus = "cancelled"
	BatchStatusPaused     BatchStatus = "paused"
)

// BatchVideo represents a single video in a batch
type BatchVideo struct {
	ID          string            `json:"id"`
	BatchID     string            `json:"batchId"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Status      VideoStatus       `json:"status"`
	TimelineID  string            `json:"timelineId,omitempty"`
	Config      VideoConfig       `json:"config"`
	Progress    float64           `json:"progress"`
	Error       string            `json:"error,omitempty"`
	Result      *VideoResult      `json:"result,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
	StartedAt   *time.Time        `json:"startedAt,omitempty"`
	CompletedAt *time.Time        `json:"completedAt,omitempty"`
}

// VideoStatus represents the status of a video in a batch
type VideoStatus string

const (
	VideoStatusPending    VideoStatus = "pending"
	VideoStatusQueued     VideoStatus = "queued"
	VideoStatusProcessing VideoStatus = "processing"
	VideoStatusCompleted  VideoStatus = "completed"
	VideoStatusFailed     VideoStatus = "failed"
	VideoStatusCancelled  VideoStatus = "cancelled"
)

// BatchConfig contains configuration for batch processing
type BatchConfig struct {
	TemplateID       string                 `json:"templateId,omitempty"`
	VideoStyle       string                 `json:"videoStyle,omitempty"`
	ScriptSource     string                 `json:"scriptSource,omitempty"` // ai, custom, rss
	CustomScripts    []string               `json:"customScripts,omitempty"`
	RSSFeedURL       string                 `json:"rssFeedUrl,omitempty"`
	AIConfig         map[string]interface{} `json:"aiConfig,omitempty"`
	OutputSettings   OutputSettings         `json:"outputSettings"`
	EnableScheduling bool                   `json:"enableScheduling"`
	ScheduleTimes    []string               `json:"scheduleTimes,omitempty"`
	PublishPlatforms []string               `json:"publishPlatforms,omitempty"`
}

// VideoConfig contains configuration for a single video
type VideoConfig struct {
	Script      string                 `json:"script,omitempty"`
	SceneConfig map[string]interface{} `json:"sceneConfig,omitempty"`
	MediaURLs   []string               `json:"mediaUrls,omitempty"`
	VoiceID     string                 `json:"voiceId,omitempty"`
	Style       string                 `json:"style,omitempty"`
}

// VideoResult contains the result of video generation
type VideoResult struct {
	VideoURL    string            `json:"videoUrl"`
	Thumbnail   string            `json:"thumbnail,omitempty"`
	Duration    float64           `json:"duration"`
	Format      string            `json:"format"`
	Size        int64             `json:"size"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	TimelineID  string            `json:"timelineId,omitempty"`
}

// OutputSettings contains output configuration
type OutputSettings struct {
	Format      string `json:"format"`
	Resolution  string `json:"resolution"`
	Quality     string `json:"quality"`
	MaxDuration int    `json:"maxDuration"`
}
