package main

import (
	"context"
)

func getLongURLByID(id int) (long_url string, err error) {
	err = db.QueryRow(context.Background(), "SELECT long_url FROM long_urls WHERE id=$1", id).Scan(&long_url)
	if err != nil {
		return "", err
	}
	return long_url, nil
}

func createLongURL(long_url string) (id int, err error) {
	err = db.QueryRow(context.Background(), "INSERT INTO long_urls (long_url) VALUES ($1) RETURNING id", long_url).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}
