package mth.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import mth.models.Menus;


public interface MenusRepository extends JpaRepository<Menus, Long> {
}
