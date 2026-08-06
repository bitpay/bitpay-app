package main

import (
	"fmt"

	"github.com/DataDog/datadog-go/statsd"
	"github.com/hibiken/asynq"
	"github.com/sirupsen/logrus"

	"github.com/vultisig/vultiserver/config"
	"github.com/vultisig/vultiserver/internal/tasks"
	"github.com/vultisig/vultiserver/service"
	"github.com/vultisig/vultiserver/storage"
)

// This local worker deliberately consumes only MPC work. The upstream server
// still creates its normal verification code and email-queue task, but this
// process neither registers email handlers nor listens to the email queue.
func main() {
	cfg, err := config.GetConfigure()
	if err != nil {
		panic(err)
	}
	sdClient, err := statsd.New("127.0.0.1:8125")
	if err != nil {
		panic(err)
	}
	blockStorage, err := storage.NewBlockStorage(*cfg)
	if err != nil {
		panic(err)
	}
	redisOptions := asynq.RedisClientOpt{
		Addr:     cfg.Redis.Host + ":" + cfg.Redis.Port,
		Username: cfg.Redis.User,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}
	client := asynq.NewClient(redisOptions)
	defer client.Close()
	workerService, err := service.NewWorker(*cfg, client, sdClient, blockStorage)
	if err != nil {
		panic(err)
	}

	srv := asynq.NewServer(redisOptions, asynq.Config{
		Logger:      logrus.StandardLogger(),
		Concurrency: 10,
		Queues:      map[string]int{tasks.QUEUE_NAME: 10},
	})
	mux := asynq.NewServeMux()
	mux.HandleFunc(tasks.TypeKeyGeneration, workerService.HandleKeyGeneration)
	mux.HandleFunc(tasks.TypeKeySign, workerService.HandleKeySign)
	mux.HandleFunc(tasks.TypeReshare, workerService.HandleReshare)
	mux.HandleFunc(tasks.TypeKeyGenerationDKLS, workerService.HandleKeyGenerationDKLS)
	mux.HandleFunc(tasks.TypeKeySignDKLS, workerService.HandleKeySignDKLS)
	mux.HandleFunc(tasks.TypeReshareDKLS, workerService.HandleReshareDKLS)
	mux.HandleFunc(tasks.TypeMigrate, workerService.HandleMigrateDKLS)
	mux.HandleFunc(tasks.TypeImport, workerService.HandleImport)
	mux.HandleFunc(tasks.TypeCreateMldsa, workerService.HandleCreateMldsa)
	mux.HandleFunc(tasks.TypeKeygenBatch, workerService.HandleKeygenBatch)
	mux.HandleFunc(tasks.TypeReshareBatch, workerService.HandleReshareBatch)
	mux.HandleFunc(tasks.TypeImportBatch, workerService.HandleImportBatch)

	if err := srv.Run(mux); err != nil {
		panic(fmt.Errorf("could not run server: %w", err))
	}
}
